-- Drop the current policy
DROP POLICY IF EXISTS "Users can update projects in their companies" ON public.projects;

-- Create a simple policy that allows owners and responsibles to do ANY update
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
  )
);