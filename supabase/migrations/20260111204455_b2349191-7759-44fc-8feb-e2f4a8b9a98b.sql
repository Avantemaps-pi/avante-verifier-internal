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