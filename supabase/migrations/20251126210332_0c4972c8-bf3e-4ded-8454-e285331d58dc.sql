-- Fix infinite recursion in profiles RLS policies
-- Create security definer function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own non-privileged fields" ON public.profiles;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can update their own non-privileged fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = public.get_user_role(auth.uid())
  AND can_delete = (SELECT can_delete FROM public.profiles WHERE id = auth.uid())
  AND can_view_logs = (SELECT can_view_logs FROM public.profiles WHERE id = auth.uid())
  AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
);

-- Fix other policies that have the same issue
-- Update user_companies policies
DROP POLICY IF EXISTS "Admins can manage mappings for their companies" ON public.user_companies;

CREATE POLICY "Admins can manage mappings for their companies"
ON public.user_companies
FOR ALL
USING (
  (public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))
  AND (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ))
);