-- Tighten profiles access: only self, scoped admins, and super_admins

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Profiles scoped by role and company" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by self, admins (scoped), and super admins" ON public.profiles;

-- CREATE new SELECT policy with explicit access control
CREATE POLICY "Profiles readable by self, admins (scoped), and super admins"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
  AND is_active = true
  AND (
    -- self: users can always see their own profile
    id = auth.uid()
    OR
    -- super admin: can see all profiles globally
    public.is_super_admin(auth.uid())
    OR
    -- admins: can only see users within their companies
    (
      public.is_admin(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_companies uc_admin
        JOIN public.user_companies uc_user
          ON uc_admin.company_id = uc_user.company_id
        WHERE uc_admin.user_id = auth.uid()
          AND uc_user.user_id = public.profiles.id
      )
    )
  )
);

-- UPDATE policies remain as before (already properly scoped)