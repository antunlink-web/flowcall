-- Create branding_settings table
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT,
  app_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '200 98% 39%',
  secondary_color TEXT DEFAULT '215 24% 26%',
  accent_color TEXT DEFAULT '210 40% 98%',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only allow one row (singleton pattern)
CREATE UNIQUE INDEX branding_settings_singleton ON public.branding_settings ((true));

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read branding settings (needed for theming)
CREATE POLICY "Branding settings are viewable by everyone"
ON public.branding_settings
FOR SELECT
USING (true);

-- Only owners can modify branding settings
CREATE POLICY "Only owners can insert branding settings"
ON public.branding_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Only owners can update branding settings"
ON public.branding_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Create trigger for updated_at
CREATE TRIGGER update_branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default branding row
INSERT INTO public.branding_settings (company_name, app_name) VALUES ('My Company', 'CRM');

-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Storage policies for branding bucket
CREATE POLICY "Branding assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Only owners can upload branding assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Only owners can update branding assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Only owners can delete branding assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'owner'));