-- ==========================================
-- FIX: Remove SECURITY DEFINER from view
-- ==========================================
-- The view doesn't need SECURITY DEFINER because the
-- can_view_company_sensitive_data() function is already SECURITY DEFINER

-- Drop the problematic view
DROP VIEW IF EXISTS public.companies_safe;

-- Recreate without SECURITY DEFINER
CREATE VIEW public.companies_safe AS
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

-- Grant access to the view
GRANT SELECT ON public.companies_safe TO authenticated;

COMMENT ON VIEW public.companies_safe IS 'Safe view of companies that hides tax_id from normal users. Only super_admins and company admins can see tax_id. The can_view_company_sensitive_data() function is SECURITY DEFINER, so this view does not need to be.';