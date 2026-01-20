-- Add 'product_owner' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_owner';