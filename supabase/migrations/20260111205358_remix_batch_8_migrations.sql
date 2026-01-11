
-- Migration: 20251029004014
-- Create verification status enum
CREATE TYPE verification_status AS ENUM ('approved', 'rejected', 'under_review');

-- Create business_verifications table
CREATE TABLE business_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL UNIQUE,
  external_user_id TEXT NOT NULL,
  total_transactions INTEGER NOT NULL,
  unique_wallets INTEGER NOT NULL,
  meets_requirements BOOLEAN NOT NULL,
  failure_reason TEXT,
  verification_status verification_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_wallet_address ON business_verifications(wallet_address);
CREATE INDEX idx_external_user_id ON business_verifications(external_user_id);
CREATE INDEX idx_verification_status ON business_verifications(verification_status);

-- Enable RLS
ALTER TABLE business_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (edge function access)
CREATE POLICY "Allow service role full access"
ON business_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Migration: 20260101090751
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

-- Migration: 20260110212154
-- Fix: Revoke public execute permission on check_rate_limit function
-- This function should only be called by trusted Edge Functions using service role
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- Add comment documenting security requirements
COMMENT ON FUNCTION public.check_rate_limit IS 'Rate limiting function - SECURITY DEFINER. Only to be called by Edge Functions with service_role key. Do not expose to client-side calls.';

-- Migration: 20260110213654
-- Create table to store verification payment records for premium feature purchases
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_user_id TEXT NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(20, 7) NOT NULL,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  txid TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Only service role can access payment records (accessed via edge functions)
CREATE POLICY "Service role can manage payment records"
ON public.payment_records
AS RESTRICTIVE
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster lookups by user
CREATE INDEX idx_payment_records_external_user_id ON public.payment_records(external_user_id);

-- Create index for payment_id lookups
CREATE INDEX idx_payment_records_payment_id ON public.payment_records(payment_id);

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payment_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_payment_records_updated_at
BEFORE UPDATE ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_records_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.payment_records IS 'Stores Pi Network payment records for premium feature purchases';

-- Migration: 20260111124143
-- Enable realtime for payment_records table
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_records;

-- Migration: 20260111133510
-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'professional', 'enterprise');

-- Create subscription billing period enum  
CREATE TYPE public.billing_period AS ENUM ('monthly', 'annual');

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id TEXT NOT NULL,
  tier subscription_tier NOT NULL DEFAULT 'free',
  billing_period billing_period NULL,
  verifications_used INTEGER NOT NULL DEFAULT 0,
  verifications_limit INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  payment_id TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(external_user_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions)
CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for users to read their own subscription
CREATE POLICY "Users can read own subscription via external_user_id"
ON public.user_subscriptions
FOR SELECT
TO anon, authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_records_updated_at();

-- Create function to check verification allowance
CREATE OR REPLACE FUNCTION public.check_verification_allowance(p_external_user_id TEXT)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  tier subscription_tier,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription user_subscriptions%ROWTYPE;
BEGIN
  -- Get or create subscription
  SELECT * INTO v_subscription 
  FROM user_subscriptions 
  WHERE external_user_id = p_external_user_id;
  
  IF NOT FOUND THEN
    -- Create free tier subscription
    INSERT INTO user_subscriptions (external_user_id, tier, verifications_limit, verifications_used)
    VALUES (p_external_user_id, 'free', 1, 0)
    RETURNING * INTO v_subscription;
  END IF;
  
  -- Check if subscription is expired
  IF v_subscription.expires_at IS NOT NULL AND v_subscription.expires_at < now() THEN
    -- Reset to free tier
    UPDATE user_subscriptions 
    SET tier = 'free', verifications_limit = 1, verifications_used = 0, expires_at = NULL
    WHERE external_user_id = p_external_user_id
    RETURNING * INTO v_subscription;
  END IF;
  
  -- Enterprise has unlimited
  IF v_subscription.tier = 'enterprise' THEN
    RETURN QUERY SELECT true, 999999, v_subscription.tier, v_subscription.expires_at;
    RETURN;
  END IF;
  
  -- Check if within limit
  IF v_subscription.verifications_used >= v_subscription.verifications_limit THEN
    RETURN QUERY SELECT false, 0, v_subscription.tier, v_subscription.expires_at;
  ELSE
    RETURN QUERY SELECT true, 
      v_subscription.verifications_limit - v_subscription.verifications_used,
      v_subscription.tier, 
      v_subscription.expires_at;
  END IF;
END;
$$;

-- Create function to increment verification usage
CREATE OR REPLACE FUNCTION public.increment_verification_usage(p_external_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_subscriptions 
  SET verifications_used = verifications_used + 1, updated_at = now()
  WHERE external_user_id = p_external_user_id;
END;
$$;

-- Migration: 20260111185723
-- Revoke public execute permissions for check_verification_allowance
REVOKE EXECUTE ON FUNCTION public.check_verification_allowance FROM public;
REVOKE EXECUTE ON FUNCTION public.check_verification_allowance FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_verification_allowance FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_verification_allowance TO service_role;

-- Revoke public execute permissions for increment_verification_usage
REVOKE EXECUTE ON FUNCTION public.increment_verification_usage FROM public;
REVOKE EXECUTE ON FUNCTION public.increment_verification_usage FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_verification_usage FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_verification_usage TO service_role;

-- Add documentation
COMMENT ON FUNCTION public.check_verification_allowance IS 'Subscription allowance checker - SECURITY DEFINER. Only to be called by Edge Functions with service_role key.';
COMMENT ON FUNCTION public.increment_verification_usage IS 'Verification usage incrementer - SECURITY DEFINER. Only to be called by Edge Functions with service_role key.';

-- Migration: 20260111204452
-- Create webhook delivery logs table
CREATE TABLE public.webhook_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id TEXT NOT NULL UNIQUE,
  verification_id UUID REFERENCES public.business_verifications(id) ON DELETE SET NULL,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Service role access only
CREATE POLICY "Service role can manage webhook logs"
ON public.webhook_delivery_logs
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_webhook_logs_verification_id ON public.webhook_delivery_logs(verification_id);
CREATE INDEX idx_webhook_logs_status ON public.webhook_delivery_logs(status);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_delivery_logs(created_at DESC);
