-- Drop the restrictive soft delete policy
DROP POLICY IF EXISTS "Users can soft delete projects" ON public.projects;

-- Create as PERMISSIVE policy (default) instead
CREATE POLICY "Project owners and responsibles can soft delete" ON public.projects
FOR UPDATE
TO authenticated
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  (
    is_super_admin(auth.uid()) OR
    (is_admin_or_above(auth.uid()) AND (SELECT can_delete FROM profiles WHERE id = auth.uid()) = true AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())) OR
    ((SELECT can_delete FROM profiles WHERE id = auth.uid()) = true AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())) OR
    owner_user_id = auth.uid() OR
    responsible1_user_id = auth.uid() OR
    responsible2_user_id = auth.uid()
  )
)
WITH CHECK (deleted_at IS NOT NULL);