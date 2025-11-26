-- Fix security issues: email exposure, company data exposure, and document sharing bypass

-- 1. Create helper function to check if user is specifically an admin (not super_admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = _user_id;
$$;

-- 2. FIX PROFILES - Scope email visibility by role and company
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles scoped by role and company" ON public.profiles;

CREATE POLICY "Profiles scoped by role and company"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
  AND is_active = true
  AND (
    -- User can see their own profile
    id = auth.uid()
    -- Super admin can see all profiles
    OR public.is_super_admin(auth.uid())
    -- Admin can see profiles of users in their companies
    OR (
      public.is_admin(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_companies uc_admin
        JOIN public.user_companies uc_user ON uc_user.company_id = uc_admin.company_id
        WHERE uc_admin.user_id = auth.uid()
          AND uc_user.user_id = public.profiles.id
      )
    )
  )
);

-- 3. FIX COMPANIES - Ensure authenticated and company-scoped access only
DROP POLICY IF EXISTS "Users can view their assigned companies" ON public.companies;
DROP POLICY IF EXISTS "Companies scoped by user" ON public.companies;

CREATE POLICY "Companies scoped by user"
ON public.companies
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
  AND (
    -- Super admin can see all companies
    public.is_super_admin(auth.uid())
    -- Users can only see companies they're assigned to
    OR id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  )
);

-- 4. FIX DOCUMENTS - Remove global SHARED bypass, enforce company boundaries
DROP POLICY IF EXISTS "Users can view documents based on visibility" ON public.documents;
DROP POLICY IF EXISTS "Documents viewable by company users" ON public.documents;

CREATE POLICY "Documents viewable by company users"
ON public.documents
FOR SELECT
USING (
  deleted_at IS NULL
  AND auth.uid() IS NOT NULL
  AND (
    -- Super admin can see all documents
    public.is_super_admin(auth.uid())
    -- Users can only see documents from their companies
    -- (regardless of visibility - SHARED still respects company boundaries)
    OR owner_company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  )
);