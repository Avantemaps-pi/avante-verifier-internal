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