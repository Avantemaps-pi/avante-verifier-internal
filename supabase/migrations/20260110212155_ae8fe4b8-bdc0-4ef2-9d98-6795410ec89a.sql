-- Fix: Revoke public execute permission on check_rate_limit function
-- This function should only be called by trusted Edge Functions using service role
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- Add comment documenting security requirements
COMMENT ON FUNCTION public.check_rate_limit IS 'Rate limiting function - SECURITY DEFINER. Only to be called by Edge Functions with service_role key. Do not expose to client-side calls.';