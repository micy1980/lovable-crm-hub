-- Drop existing soft delete policy
DROP POLICY IF EXISTS "Users with can_delete can soft delete projects" ON public.projects;

-- Create new policy that allows:
-- 1. Users with can_delete permission
-- 2. Project owner
-- 3. Project responsibles (responsible1, responsible2)
-- 4. Super admins and admins
CREATE POLICY "Users can soft delete projects" ON public.projects
FOR UPDATE
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  (
    -- Super admin can delete any
    is_super_admin(auth.uid()) OR
    -- Admin with can_delete can delete in their companies
    (is_admin_or_above(auth.uid()) AND (SELECT can_delete FROM profiles WHERE id = auth.uid()) = true AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())) OR
    -- User with can_delete can delete in their companies
    ((SELECT can_delete FROM profiles WHERE id = auth.uid()) = true AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())) OR
    -- Project owner can delete their own project
    owner_user_id = auth.uid() OR
    -- Project responsibles can delete their assigned project
    responsible1_user_id = auth.uid() OR
    responsible2_user_id = auth.uid()
  )
)
WITH CHECK (deleted_at IS NOT NULL);