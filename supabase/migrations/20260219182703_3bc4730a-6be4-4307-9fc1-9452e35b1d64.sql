-- Fix: allow "completed" status in dial_requests (foreground service uses this value)
ALTER TABLE public.dial_requests DROP CONSTRAINT dial_requests_status_check;
ALTER TABLE public.dial_requests ADD CONSTRAINT dial_requests_status_check 
  CHECK (status = ANY (ARRAY['pending', 'sent', 'dialed', 'completed', 'failed']));

-- Clean up old stale pending requests
DELETE FROM public.dial_requests WHERE status = 'pending' AND created_at < '2026-02-19T00:00:00Z';