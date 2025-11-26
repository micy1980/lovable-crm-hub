-- Restrict logs access to super_admin only
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users with can_view_logs can view logs" ON public.logs;
DROP POLICY IF EXISTS "Logs viewable by super admin only" ON public.logs;

-- CREATE new SELECT policy: only super_admin can read logs
CREATE POLICY "Logs viewable by super admin only"
ON public.logs
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Ensure UPDATE is disabled (already exists but recreate for clarity)
DROP POLICY IF EXISTS "Logs cannot be updated" ON public.logs;
CREATE POLICY "Logs cannot be updated"
ON public.logs
FOR UPDATE
USING (false)
WITH CHECK (false);

-- Ensure DELETE is disabled (already exists but recreate for clarity)
DROP POLICY IF EXISTS "Logs cannot be deleted" ON public.logs;
CREATE POLICY "Logs cannot be deleted"
ON public.logs
FOR DELETE
USING (false);

-- Keep INSERT restricted to super_admin (already exists)
DROP POLICY IF EXISTS "Super admins can insert logs" ON public.logs;
CREATE POLICY "Super admins can insert logs"
ON public.logs
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));