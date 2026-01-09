-- Table to track user devices (PC/mobile)
CREATE TABLE public.user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile')),
  push_subscription JSONB,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_type, device_name)
);

-- Table to store dial requests from PC to mobile
CREATE TABLE public.dial_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dialed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dial_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_devices
CREATE POLICY "Users can view their own devices"
ON public.user_devices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can register their own devices"
ON public.user_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
ON public.user_devices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
ON public.user_devices FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for dial_requests
CREATE POLICY "Users can view their own dial requests"
ON public.dial_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dial requests"
ON public.dial_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dial requests"
ON public.dial_requests FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for dial_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.dial_requests;

-- Indexes for performance
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_active ON public.user_devices(user_id, is_active, device_type);
CREATE INDEX idx_dial_requests_user_pending ON public.dial_requests(user_id, status) WHERE status = 'pending';

-- Triggers for updated_at
CREATE TRIGGER update_user_devices_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();