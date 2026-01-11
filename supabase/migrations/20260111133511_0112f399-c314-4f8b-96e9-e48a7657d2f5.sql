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