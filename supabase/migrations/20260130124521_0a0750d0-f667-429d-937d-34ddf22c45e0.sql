-- Drop the incorrect singleton constraint that only allows ONE row in the entire table
DROP INDEX IF EXISTS branding_settings_singleton;

-- Add a unique constraint on tenant_id so each tenant can have exactly one branding settings row
CREATE UNIQUE INDEX branding_settings_tenant_unique ON public.branding_settings (tenant_id) WHERE tenant_id IS NOT NULL;