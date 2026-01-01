-- Create rate limits table for tracking verification requests
CREATE TABLE public.verification_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge function uses service role)
CREATE POLICY "Service role can manage rate limits"
ON public.verification_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_wallet ON public.verification_rate_limits(wallet_address);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_wallet_address TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_hours INTEGER DEFAULT 1
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record verification_rate_limits%ROWTYPE;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := now() - (p_window_hours || ' hours')::INTERVAL;
  
  -- Try to get existing record
  SELECT * INTO v_record 
  FROM verification_rate_limits 
  WHERE wallet_address = p_wallet_address;
  
  IF NOT FOUND THEN
    -- First request, create new record
    INSERT INTO verification_rate_limits (wallet_address, request_count, window_start)
    VALUES (p_wallet_address, 1, now())
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT true, 1, v_record.window_start + (p_window_hours || ' hours')::INTERVAL;
  ELSIF v_record.window_start < v_window_start THEN
    -- Window expired, reset counter
    UPDATE verification_rate_limits 
    SET request_count = 1, window_start = now(), updated_at = now()
    WHERE wallet_address = p_wallet_address
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT true, 1, v_record.window_start + (p_window_hours || ' hours')::INTERVAL;
  ELSIF v_record.request_count >= p_max_requests THEN
    -- Rate limit exceeded
    RETURN QUERY SELECT false, v_record.request_count, v_record.window_start + (p_window_hours || ' hours')::INTERVAL;
  ELSE
    -- Increment counter
    UPDATE verification_rate_limits 
    SET request_count = request_count + 1, updated_at = now()
    WHERE wallet_address = p_wallet_address
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT true, v_record.request_count, v_record.window_start + (p_window_hours || ' hours')::INTERVAL;
  END IF;
END;
$$;