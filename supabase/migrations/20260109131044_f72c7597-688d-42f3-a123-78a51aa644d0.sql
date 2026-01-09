-- Create sms_requests table for SMS sending via companion app
CREATE TABLE public.sms_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own SMS requests
CREATE POLICY "Users can create their own sms requests"
ON public.sms_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own SMS requests
CREATE POLICY "Users can view their own sms requests"
ON public.sms_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own SMS requests
CREATE POLICY "Users can update their own sms requests"
ON public.sms_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for sms_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_requests;