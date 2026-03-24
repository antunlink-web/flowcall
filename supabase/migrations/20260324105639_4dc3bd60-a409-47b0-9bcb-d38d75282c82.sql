
-- Add next action fields to leads table (non-destructive extension)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS next_action_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.leads.next_action_type IS 'FlowCall action type: call, follow_up, retry, none';
COMMENT ON COLUMN public.leads.next_action_at IS 'Scheduled datetime for the next action';
