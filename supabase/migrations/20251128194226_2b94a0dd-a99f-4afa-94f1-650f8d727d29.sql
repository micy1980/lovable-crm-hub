-- Add constraints to company_licenses table
ALTER TABLE public.company_licenses
  ADD CONSTRAINT valid_dates_check CHECK (valid_until >= valid_from),
  ADD CONSTRAINT max_users_positive CHECK (max_users >= 1);

-- Create unique constraint to prevent multiple active licenses per company
CREATE UNIQUE INDEX idx_company_licenses_unique_company 
  ON public.company_licenses(company_id);

-- Update RLS policies for company_licenses
DROP POLICY IF EXISTS "Company admins can view their own license" ON public.company_licenses;
DROP POLICY IF EXISTS "SA can manage all company licenses" ON public.company_licenses;

-- Only SA can manage licenses
CREATE POLICY "SA can manage all company licenses"
  ON public.company_licenses
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Company admins and users can view their own company's license
CREATE POLICY "Users can view their company license"
  ON public.company_licenses
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.user_company_permissions 
      WHERE user_id = auth.uid()
    )
  );