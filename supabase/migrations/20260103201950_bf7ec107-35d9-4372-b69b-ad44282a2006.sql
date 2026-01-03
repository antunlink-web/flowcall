
-- Add a flexible data column for storing arbitrary CSV fields
ALTER TABLE public.leads ADD COLUMN data jsonb DEFAULT '{}'::jsonb;

-- Migrate existing data to the new structure
UPDATE public.leads SET data = jsonb_build_object(
  'first_name', first_name,
  'last_name', last_name,
  'company', company,
  'phone', phone,
  'email', email,
  'notes', notes
);

-- Drop the old fixed columns
ALTER TABLE public.leads DROP COLUMN first_name;
ALTER TABLE public.leads DROP COLUMN last_name;
ALTER TABLE public.leads DROP COLUMN company;
ALTER TABLE public.leads DROP COLUMN phone;
ALTER TABLE public.leads DROP COLUMN email;
ALTER TABLE public.leads DROP COLUMN notes;
