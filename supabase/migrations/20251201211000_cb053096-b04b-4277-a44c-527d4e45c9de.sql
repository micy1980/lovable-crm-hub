-- ==========================================
-- KÖZEPES PRIORITÁSÚ SECURITY JAVÍTÁSOK
-- ==========================================
-- 1. Partners tábla: Company-scoping hozzáadása
-- 2. Companies tábla: Tax_id access restriction

-- ===========================================
-- 1. PARTNERS TÁBLA: COMPANY-SCOPING
-- ===========================================

-- 1.1. Add company_id column to partners table
ALTER TABLE public.partners
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 1.2. Create index for better performance
CREATE INDEX idx_partners_company_id ON public.partners(company_id);

-- 1.3. Drop old RLS policies that allow cross-company visibility
DROP POLICY IF EXISTS "Authenticated company users can view partners" ON public.partners;
DROP POLICY IF EXISTS "Admins can insert partners" ON public.partners;
DROP POLICY IF EXISTS "Admins can update partners" ON public.partners;
DROP POLICY IF EXISTS "Admins with can_delete can soft delete partners" ON public.partners;

-- 1.4. Create new company-scoped RLS policies for partners
CREATE POLICY "Users can view partners in their companies"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND (
      is_super_admin(auth.uid())
      OR company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert partners in their companies"
  ON public.partners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
      is_super_admin(auth.uid())
      OR company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can update partners in their companies"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
      is_super_admin(auth.uid())
      OR company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
      is_super_admin(auth.uid())
      OR company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins with can_delete can soft delete partners"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_above(auth.uid())
    AND (
      SELECT can_delete
      FROM public.profiles
      WHERE id = auth.uid()
    ) = true
    AND (
      is_super_admin(auth.uid())
      OR company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (deleted_at IS NOT NULL);

-- ===========================================
-- 2. COMPANIES TÁBLA: TAX_ID ACCESS RESTRICTION
-- ===========================================

-- 2.1. Create secure function to check if user can view sensitive company data
CREATE OR REPLACE FUNCTION public.can_view_company_sensitive_data(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_company_permissions ucp
      WHERE ucp.user_id = _user_id
        AND ucp.company_id = _company_id
        AND ucp.role IN ('ADMIN')
    );
$$;

-- 2.2. Create a view that hides tax_id from normal users
CREATE OR REPLACE VIEW public.companies_safe AS
SELECT
  c.id,
  c.name,
  c.address,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  -- Only show tax_id if user has permission
  CASE
    WHEN can_view_company_sensitive_data(auth.uid(), c.id) THEN c.tax_id
    ELSE NULL
  END AS tax_id
FROM public.companies c
WHERE c.deleted_at IS NULL;

-- 2.3. Grant access to the view
GRANT SELECT ON public.companies_safe TO authenticated;

COMMENT ON VIEW public.companies_safe IS 'Safe view of companies that hides tax_id from normal users. Only super_admins and company admins can see tax_id.';
COMMENT ON COLUMN public.partners.company_id IS 'Company that owns this partner. Added for company-scoping and data isolation.';
COMMENT ON FUNCTION public.can_view_company_sensitive_data IS 'Security definer function to check if user can view sensitive company data like tax_id. Returns true for super_admins and company admins.';