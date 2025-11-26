-- Fix costs table RLS for proper soft-delete handling
DROP POLICY IF EXISTS "Users can create costs for projects in their companies" ON public.costs;
DROP POLICY IF EXISTS "Users can update costs for projects in their companies" ON public.costs;
DROP POLICY IF EXISTS "Users can view costs for projects in their companies" ON public.costs;

-- SELECT: Only non-deleted costs visible to users in their companies
CREATE POLICY "Users can view non-deleted costs in their companies"
ON public.costs
FOR SELECT
USING (
  deleted_at IS NULL
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR project_id IN (
      SELECT p.id FROM public.projects p
      INNER JOIN public.user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
    )
  )
);

-- INSERT: Only admin/super_admin can create costs in their companies
CREATE POLICY "Admins can create costs in their companies"
ON public.costs
FOR INSERT
WITH CHECK (
  deleted_at IS NULL
  AND public.is_admin_or_above(auth.uid())
  AND (
    public.is_super_admin(auth.uid())
    OR project_id IN (
      SELECT p.id FROM public.projects p
      INNER JOIN public.user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
    )
  )
);

-- UPDATE: Normal updates (not soft-delete) for non-deleted costs
CREATE POLICY "Admins can update non-deleted costs in their companies"
ON public.costs
FOR UPDATE
USING (
  deleted_at IS NULL
  AND public.is_admin_or_above(auth.uid())
  AND (
    public.is_super_admin(auth.uid())
    OR project_id IN (
      SELECT p.id FROM public.projects p
      INNER JOIN public.user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
    )
  )
)
WITH CHECK (deleted_at IS NULL);

-- SOFT DELETE: Only users with can_delete permission can mark as deleted
CREATE POLICY "Users with can_delete can soft delete costs"
ON public.costs
FOR UPDATE
USING (
  deleted_at IS NULL
  AND public.is_admin_or_above(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.can_delete = true
    AND p.is_active = true
    AND p.deleted_at IS NULL
  )
)
WITH CHECK (deleted_at IS NOT NULL);