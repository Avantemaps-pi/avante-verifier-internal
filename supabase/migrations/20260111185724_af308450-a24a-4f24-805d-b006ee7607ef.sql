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