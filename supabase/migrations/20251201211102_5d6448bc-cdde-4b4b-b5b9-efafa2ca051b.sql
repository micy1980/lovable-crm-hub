-- ==========================================
-- FIX: Add security_invoker=on to view
-- ==========================================
-- PostgreSQL views default to SECURITY DEFINER for backwards compatibility
-- We need to explicitly set security_invoker=on to make it use the
-- querying user's permissions (not the creator's)

-- Drop the view
DROP VIEW IF EXISTS public.companies_safe;

-- Recreate with security_invoker=on
CREATE VIEW public.companies_safe
WITH (security_invoker=on)
AS
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

COMMENT ON VIEW public.companies_safe IS 'Safe view of companies that hides tax_id from normal users. Only super_admins and company admins can see tax_id. Uses security_invoker=on to respect RLS policies.';