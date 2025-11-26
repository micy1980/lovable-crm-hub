-- Harden master_data access: only super_admin can modify

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage master data" ON public.master_data;
DROP POLICY IF EXISTS "Authenticated users can view master data" ON public.master_data;
DROP POLICY IF EXISTS "Master data readable by authenticated users" ON public.master_data;
DROP POLICY IF EXISTS "Master data modifiable by super admin only" ON public.master_data;

-- SELECT: Any authenticated user can read master_data
CREATE POLICY "Master data readable by authenticated users"
ON public.master_data
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Only super_admin can modify
CREATE POLICY "Master data modifiable by super admin only"
ON public.master_data
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));