-- Update profiles SELECT policy to not depend on is_active flag
DROP POLICY IF EXISTS "Profiles readable by self, admins (scoped), and super admins" ON public.profiles;

CREATE POLICY "Profiles readable by self, admins (scoped), and super admins"
ON public.profiles
FOR SELECT
TO public
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
  AND (
    id = auth.uid()
    OR is_super_admin(auth.uid())
    OR (
      is_admin(auth.uid()) AND EXISTS (
        SELECT 1
        FROM user_companies uc_admin
        JOIN user_companies uc_user ON uc_admin.company_id = uc_user.company_id
        WHERE uc_admin.user_id = auth.uid()
          AND uc_user.user_id = profiles.id
      )
    )
  )
);