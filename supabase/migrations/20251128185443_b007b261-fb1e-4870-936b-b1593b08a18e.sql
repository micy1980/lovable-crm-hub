-- Remove license_type column from company_licenses table
ALTER TABLE public.company_licenses DROP COLUMN IF EXISTS license_type;