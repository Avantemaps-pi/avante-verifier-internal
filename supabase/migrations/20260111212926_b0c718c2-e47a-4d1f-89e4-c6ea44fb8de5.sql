-- Update the check_verification_allowance function to default to enterprise tier
CREATE OR REPLACE FUNCTION public.check_verification_allowance(p_external_user_id text)
 RETURNS TABLE(allowed boolean, remaining integer, tier subscription_tier, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription user_subscriptions%ROWTYPE;
BEGIN
  -- Get or create subscription
  SELECT * INTO v_subscription 
  FROM user_subscriptions 
  WHERE external_user_id = p_external_user_id;
  
  IF NOT FOUND THEN
    -- Create enterprise tier subscription (changed from free)
    INSERT INTO user_subscriptions (external_user_id, tier, verifications_limit, verifications_used)
    VALUES (p_external_user_id, 'enterprise', 999999, 0)
    RETURNING * INTO v_subscription;
  END IF;
  
  -- Check if subscription is expired
  IF v_subscription.expires_at IS NOT NULL AND v_subscription.expires_at < now() THEN
    -- Reset to enterprise tier (changed from free)
    UPDATE user_subscriptions 
    SET tier = 'enterprise', verifications_limit = 999999, verifications_used = 0, expires_at = NULL
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
$function$;

-- Upgrade all existing free tier users to enterprise
UPDATE user_subscriptions 
SET tier = 'enterprise', verifications_limit = 999999 
WHERE tier = 'free';