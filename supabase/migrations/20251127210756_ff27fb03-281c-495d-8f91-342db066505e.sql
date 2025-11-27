-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view permissions in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can manage lower-level users in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can update lower-level users in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions in their companies" ON public.user_company_permissions;

-- Create security definer function to check if user is admin for a company
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_permissions
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = 'ADMIN'
  )
$$;

-- Create security definer function to get all companies where user is admin
CREATE OR REPLACE FUNCTION public.get_admin_company_ids(_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_company_permissions
  WHERE user_id = _user_id
    AND role = 'ADMIN'
$$;

-- Recreate policies using security definer functions

-- Admins can view permissions for their companies
CREATE POLICY "Admins can view permissions in their companies"
ON public.user_company_permissions
FOR SELECT
USING (
  is_admin_or_above(auth.uid()) AND
  (
    company_id IN (SELECT get_admin_company_ids(auth.uid()))
  )
);

-- Admins can insert permissions only for lower-level users in their companies
CREATE POLICY "Admins can manage lower-level users in their companies"
ON public.user_company_permissions
FOR INSERT
WITH CHECK (
  is_admin_or_above(auth.uid()) AND
  (
    company_id IN (SELECT get_admin_company_ids(auth.uid()))
  ) AND
  -- Cannot create permissions for SA users
  user_id IN (SELECT id FROM profiles WHERE role != 'super_admin')
);

-- Admins can update permissions in their companies
CREATE POLICY "Admins can update lower-level users in their companies"
ON public.user_company_permissions
FOR UPDATE
USING (
  is_admin_or_above(auth.uid()) AND
  (
    company_id IN (SELECT get_admin_company_ids(auth.uid()))
  )
)
WITH CHECK (
  is_admin_or_above(auth.uid()) AND
  (
    company_id IN (SELECT get_admin_company_ids(auth.uid()))
  )
);

-- Admins can delete permissions in their companies
CREATE POLICY "Admins can delete permissions in their companies"
ON public.user_company_permissions
FOR DELETE
USING (
  is_admin_or_above(auth.uid()) AND
  (
    company_id IN (SELECT get_admin_company_ids(auth.uid()))
  )
);