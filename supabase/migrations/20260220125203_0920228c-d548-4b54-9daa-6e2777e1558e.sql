
-- Fix user_devices to allow android/ios device types
ALTER TABLE public.user_devices DROP CONSTRAINT IF EXISTS user_devices_device_type_check;
ALTER TABLE public.user_devices ADD CONSTRAINT user_devices_device_type_check 
  CHECK (device_type = ANY (ARRAY['desktop','mobile','android','ios']));

-- Fix call_logs to allow 'called' outcome (used by the auto-logging trigger)
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_outcome_check;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_outcome_check 
  CHECK (outcome = ANY (ARRAY['answered','no_answer','busy','voicemail','callback','won','lost','called']));
