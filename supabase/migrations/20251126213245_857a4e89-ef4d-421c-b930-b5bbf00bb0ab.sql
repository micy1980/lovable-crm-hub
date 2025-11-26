-- Fix profiles table RLS to prevent email harvesting
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own non-privileged fields" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;

-- SELECT: Only own profile or admin/super_admin can see all
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
  AND is_active = true
  AND (
    id = auth.uid()                    -- user sees only their own
    OR public.is_admin_or_above(auth.uid())  -- admins see all
  )
);

-- UPDATE: Users can update their own non-privileged fields
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id AND deleted_at IS NULL)
WITH CHECK (
  auth.uid() = id 
  AND deleted_at IS NULL
  -- Ensure role and permissions cannot be self-modified
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND can_delete = (SELECT can_delete FROM public.profiles WHERE id = auth.uid())
  AND can_view_logs = (SELECT can_view_logs FROM public.profiles WHERE id = auth.uid())
  AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
);

-- UPDATE: Super admins can update any profile
CREATE POLICY "Super admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  AND deleted_at IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  AND deleted_at IS NULL
);

-- Fix logs table RLS for audit integrity
DROP POLICY IF EXISTS "Users with can_view_logs can view logs" ON public.logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.logs;

-- SELECT: Only users with can_view_logs flag
CREATE POLICY "Users with can_view_logs can view logs"
ON public.logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.can_view_logs = true
    AND p.is_active = true
    AND p.deleted_at IS NULL
  )
);

-- INSERT: Only super_admin can write logs (simulating service role)
-- In production, this should be restricted to service_role via backend triggers
CREATE POLICY "Super admins can insert logs"
ON public.logs
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- UPDATE: Completely disallow (logs are immutable)
CREATE POLICY "Logs cannot be updated"
ON public.logs
FOR UPDATE
USING (false)
WITH CHECK (false);

-- DELETE: Completely disallow (logs are append-only)
CREATE POLICY "Logs cannot be deleted"
ON public.logs
FOR DELETE
USING (false);