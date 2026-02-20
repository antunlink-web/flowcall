
-- Auto-create a call_log when a dial_request is marked as completed
CREATE OR REPLACE FUNCTION public.log_completed_dial_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.call_logs (lead_id, user_id, outcome, notes, tenant_id)
    SELECT 
      NEW.lead_id,
      NEW.user_id,
      'called',
      'Auto-dialed via FlowCall Smart',
      NEW.tenant_id
    WHERE NEW.lead_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dial_request_completed
  AFTER UPDATE ON public.dial_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_completed_dial_request();
