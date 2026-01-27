-- Add trial and seat columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT (now() + interval '14 days'),
ADD COLUMN IF NOT EXISTS seat_count integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_seats integer DEFAULT NULL;

-- Update existing tenants to have trial dates if they don't have them
UPDATE public.tenants 
SET trial_start_date = created_at,
    trial_end_date = created_at + interval '14 days'
WHERE trial_start_date IS NULL;