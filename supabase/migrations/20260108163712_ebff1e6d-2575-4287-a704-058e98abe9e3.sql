-- Create table for list user access permissions
CREATE TABLE public.list_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (list_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.list_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can manage list users" 
ON public.list_users 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "All authenticated can view list users" 
ON public.list_users 
FOR SELECT 
USING (true);