-- Create helper function to check if user can soft delete a project
CREATE OR REPLACE FUNCTION public.can_soft_delete_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = _project_id
    AND (
      is_super_admin(_user_id) OR
      (is_admin_or_above(_user_id) AND (SELECT can_delete FROM profiles WHERE id = _user_id) = true) OR
      (SELECT can_delete FROM profiles WHERE id = _user_id) = true OR
      p.owner_user_id = _user_id OR
      p.responsible1_user_id = _user_id OR
      p.responsible2_user_id = _user_id
    )
  );
$$;

-- Drop and recreate UPDATE policy using the helper function
DROP POLICY IF EXISTS "Users can update projects in their companies" ON public.projects;

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
  -- Allow normal updates OR soft deletes for authorized users
  deleted_at IS NULL OR can_soft_delete_project(auth.uid(), id)
);