-- Create user_invitations table for tracking invites
CREATE TABLE public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  full_name text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- All authenticated can view invitations (for Team page)
CREATE POLICY "All authenticated can view invitations"
ON public.user_invitations FOR SELECT TO authenticated
USING (true);