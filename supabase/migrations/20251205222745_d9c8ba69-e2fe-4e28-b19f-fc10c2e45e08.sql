-- Drop ALL existing update policies on projects
DROP POLICY IF EXISTS "Users can update projects in their companies" ON public.projects;
DROP POLICY IF EXISTS "Project owners and responsibles can soft delete" ON public.projects;

-- Create single unified UPDATE policy that handles both normal updates and soft deletes
CREATE POLICY "Users can update projects in their companies" ON public.projects
FOR UPDATE
TO authenticated
USING (
  is_2fa_verified(auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
  (
    is_super_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  is_2fa_verified(auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
  (
    is_super_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  ) AND
  (
    -- Normal update (deleted_at stays NULL)
    deleted_at IS NULL
    OR
    -- Soft delete allowed for: SA, admins with can_delete, users with can_delete, owner, responsibles
    (
      deleted_at IS NOT NULL AND
      (
        is_super_admin(auth.uid()) OR
        (is_admin_or_above(auth.uid()) AND (SELECT can_delete FROM profiles WHERE id = auth.uid()) = true) OR
        ((SELECT can_delete FROM profiles WHERE id = auth.uid()) = true) OR
        owner_user_id = auth.uid() OR
        responsible1_user_id = auth.uid() OR
        responsible2_user_id = auth.uid()
      )
    )
  )
);