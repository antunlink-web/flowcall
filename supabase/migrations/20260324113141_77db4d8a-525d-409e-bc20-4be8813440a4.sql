
-- Create next_actions table
CREATE TABLE public.next_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_user_id uuid DEFAULT NULL,
  action_type text NOT NULL,
  title text DEFAULT NULL,
  description text DEFAULT NULL,
  due_at timestamptz DEFAULT NULL,
  scheduled_for timestamptz DEFAULT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  outcome text DEFAULT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  canceled_at timestamptz DEFAULT NULL,
  snoozed_until timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_next_actions_tenant_id ON public.next_actions(tenant_id);
CREATE INDEX idx_next_actions_lead_id ON public.next_actions(lead_id);
CREATE INDEX idx_next_actions_assigned_user_id ON public.next_actions(assigned_user_id);
CREATE INDEX idx_next_actions_status ON public.next_actions(status);
CREATE INDEX idx_next_actions_scheduled_for ON public.next_actions(scheduled_for);
CREATE INDEX idx_next_actions_tenant_status ON public.next_actions(tenant_id, status);
CREATE INDEX idx_next_actions_lead_status ON public.next_actions(lead_id, status);

-- Updated_at trigger
CREATE TRIGGER update_next_actions_updated_at
  BEFORE UPDATE ON public.next_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.next_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view next actions in their tenant"
  ON public.next_actions FOR SELECT
  TO authenticated
  USING (get_user_tenant_id(auth.uid()) = tenant_id);

CREATE POLICY "Users can insert next actions in their tenant"
  ON public.next_actions FOR INSERT
  TO authenticated
  WITH CHECK (get_user_tenant_id(auth.uid()) = tenant_id);

CREATE POLICY "Users can update next actions in their tenant"
  ON public.next_actions FOR UPDATE
  TO authenticated
  USING (
    get_user_tenant_id(auth.uid()) = tenant_id
    AND (assigned_user_id = auth.uid() OR assigned_user_id IS NULL OR is_admin_or_manager(auth.uid()))
  );

CREATE POLICY "Admins can delete next actions in their tenant"
  ON public.next_actions FOR DELETE
  TO authenticated
  USING (get_user_tenant_id(auth.uid()) = tenant_id AND is_admin_or_manager(auth.uid()));

-- Comments
COMMENT ON TABLE public.next_actions IS 'FlowCall next action queue — one active action per lead at a time';
COMMENT ON COLUMN public.next_actions.action_type IS 'call, retry_call, follow_up_call, send_sms, send_email, wait_for_reply, meeting, custom';
COMMENT ON COLUMN public.next_actions.status IS 'pending, completed, canceled, snoozed';
COMMENT ON COLUMN public.next_actions.priority IS 'low, normal, high, urgent';
COMMENT ON COLUMN public.next_actions.source IS 'manual, system, call_outcome, import, workflow';
