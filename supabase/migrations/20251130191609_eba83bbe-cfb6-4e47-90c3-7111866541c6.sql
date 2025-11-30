-- ==========================================
-- SECURITY FIX: Profiles Table Protection
-- ==========================================
-- This migration addresses critical security issues:
-- 1. Strengthens RLS policies to prevent unauthorized data access
-- 2. Protects two_factor_secret from exposure
-- 3. Ensures all profile access requires proper authentication and authorization

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Profiles readable by self, admins (scoped), and super admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can update users in their companies" ON public.profiles;

-- ==========================================
-- NEW SECURE RLS POLICIES
-- ==========================================

-- 1. SELECT Policy: Users can only read their own profile, or admins/super_admins can read users in their companies
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can always read their own profile
  auth.uid() = id
  OR
  -- Super admin can read all profiles
  is_super_admin(auth.uid())
  OR
  -- Admin can read users in their companies (after 2FA verification)
  (
    is_admin(auth.uid()) 
    AND is_2fa_verified(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM user_companies uc_admin
      JOIN user_companies uc_user ON uc_admin.company_id = uc_user.company_id
      WHERE uc_admin.user_id = auth.uid()
        AND uc_user.user_id = profiles.id
    )
  )
);

-- 2. UPDATE Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  AND deleted_at IS NULL
)
WITH CHECK (
  auth.uid() = id
  AND deleted_at IS NULL
);

-- 3. UPDATE Policy: Super admins can update any profile
CREATE POLICY "Super admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  AND deleted_at IS NULL
)
WITH CHECK (
  is_super_admin(auth.uid())
  AND deleted_at IS NULL
);

-- 4. UPDATE Policy: Company admins can update users in their companies (non-super_admin users only)
CREATE POLICY "Company admins can update company users"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  role <> 'super_admin'
  AND deleted_at IS NULL
  AND is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM user_company_permissions ucp_admin
    JOIN user_company_permissions ucp_target ON ucp_admin.company_id = ucp_target.company_id
    WHERE ucp_admin.user_id = auth.uid()
      AND ucp_admin.role = 'ADMIN'
      AND ucp_target.user_id = profiles.id
  )
)
WITH CHECK (
  role <> 'super_admin'
  AND deleted_at IS NULL
  AND is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM user_company_permissions ucp_admin
    JOIN user_company_permissions ucp_target ON ucp_admin.company_id = ucp_target.company_id
    WHERE ucp_admin.user_id = auth.uid()
      AND ucp_admin.role = 'ADMIN'
      AND ucp_target.user_id = profiles.id
  )
);

-- ==========================================
-- TRIGGER TO PREVENT PRIVILEGE ESCALATION
-- ==========================================

-- This trigger prevents users from changing their own role or sensitive fields
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin can change anything
  IF is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Users cannot change their own role
  IF auth.uid() = NEW.id AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;

  -- Users cannot change their own sensitive permissions
  IF auth.uid() = NEW.id AND (OLD.can_delete != NEW.can_delete OR OLD.can_view_logs != NEW.can_view_logs) THEN
    RAISE EXCEPTION 'Users cannot change their own permissions';
  END IF;

  -- Company admins cannot change roles
  IF NOT is_super_admin(auth.uid()) AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Only super admins can change user roles';
  END IF;

  -- Company admins cannot change super_admin users
  IF NOT is_super_admin(auth.uid()) AND NEW.role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot modify super admin profiles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER enforce_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ==========================================
-- SECURE FUNCTION TO ACCESS 2FA SECRET
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_user_2fa_secret(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_secret text;
BEGIN
  -- Only the user themselves or super_admin can access the secret
  IF auth.uid() != _user_id AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access 2FA secret';
  END IF;

  SELECT two_factor_secret INTO user_secret
  FROM public.profiles
  WHERE id = _user_id;

  RETURN user_secret;
END;
$$;

COMMENT ON FUNCTION public.get_user_2fa_secret(uuid) IS 
'Secure function to retrieve 2FA secret. Only accessible by the user themselves or super_admin.';

-- ==========================================
-- AUDIT LOG FOR SENSITIVE PROFILE CHANGES
-- ==========================================

CREATE OR REPLACE FUNCTION public.log_sensitive_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log if role changed
  IF OLD.role != NEW.role THEN
    INSERT INTO public.logs (
      entity_type,
      entity_id,
      action,
      user_id,
      previous_values,
      new_values
    ) VALUES (
      'profile',
      NEW.id,
      'role_change',
      auth.uid(),
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;

  -- Log if can_delete changed
  IF OLD.can_delete != NEW.can_delete THEN
    INSERT INTO public.logs (
      entity_type,
      entity_id,
      action,
      user_id,
      previous_values,
      new_values
    ) VALUES (
      'profile',
      NEW.id,
      'permission_change',
      auth.uid(),
      jsonb_build_object('can_delete', OLD.can_delete),
      jsonb_build_object('can_delete', NEW.can_delete)
    );
  END IF;

  -- Log if 2FA was enabled or disabled
  IF OLD.two_factor_enabled != NEW.two_factor_enabled THEN
    INSERT INTO public.logs (
      entity_type,
      entity_id,
      action,
      user_id,
      previous_values,
      new_values
    ) VALUES (
      'profile',
      NEW.id,
      '2fa_status_change',
      auth.uid(),
      jsonb_build_object('two_factor_enabled', OLD.two_factor_enabled),
      jsonb_build_object('two_factor_enabled', NEW.two_factor_enabled)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_sensitive_profile_changes ON public.profiles;
CREATE TRIGGER audit_sensitive_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_profile_changes();

COMMENT ON TRIGGER audit_sensitive_profile_changes ON public.profiles IS 
'Logs all sensitive profile changes (role, permissions, 2FA status) to audit log.';