-- Drop the payment_records table
DROP TABLE IF EXISTS public.payment_records;

-- Create a new properly named trigger function for user_subscriptions
CREATE OR REPLACE FUNCTION public.update_user_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Drop the old trigger that uses the payment_records function
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;

-- Create a new trigger with the properly named function
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_subscriptions_updated_at();

-- Now drop the old payment_records function
DROP FUNCTION IF EXISTS public.update_payment_records_updated_at();