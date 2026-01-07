-- Create lists table to store lead list metadata
CREATE TABLE public.lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocklist')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add list_id to leads table
ALTER TABLE public.leads ADD COLUMN list_id UUID REFERENCES public.lists(id);

-- Enable RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- Create policies for lists
CREATE POLICY "All authenticated can view lists"
ON public.lists
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage lists"
ON public.lists
FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_lists_updated_at
BEFORE UPDATE ON public.lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();