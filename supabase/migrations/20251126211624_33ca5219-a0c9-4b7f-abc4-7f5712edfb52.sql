-- Fix infinite recursion in user_companies RLS policies
-- Create helper function that only checks profiles.role (no user_companies reference)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'super_admin' FROM public.profiles WHERE id = _user_id;
$$;

-- Drop all existing policies on user_companies
DROP POLICY IF EXISTS "Admins can manage mappings for their companies" ON public.user_companies;
DROP POLICY IF EXISTS "Super admins can manage all user-company mappings" ON public.user_companies;
DROP POLICY IF EXISTS "Users can view their own company mappings" ON public.user_companies;

-- Create new, simple policies without recursion
CREATE POLICY "Users can view their own mappings or super_admin can view all"
ON public.user_companies
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admin can insert any mapping"
ON public.user_companies
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update any mapping"
ON public.user_companies
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete any mapping"
ON public.user_companies
FOR DELETE
USING (public.is_super_admin(auth.uid()));