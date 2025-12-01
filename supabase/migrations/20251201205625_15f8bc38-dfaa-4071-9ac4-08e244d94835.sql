-- ==========================================
-- SECURITY FIX: Login Attempts & Locked Accounts Protection
-- ==========================================
-- This migration addresses critical security issues:
-- 1. Adds explicit SELECT policies to prevent unauthorized data access
-- 2. Maintains INSERT policies needed for auth flow but adds RPC functions for controlled access
-- 3. Prevents flooding and data poisoning attacks

-- ==========================================
-- LOGIN_ATTEMPTS TABLE PROTECTION
-- ==========================================

-- Add explicit SELECT policy - only super_admin can read login attempts
DROP POLICY IF EXISTS "Super admins can view all login attempts" ON public.login_attempts;

CREATE POLICY "Only super admins can read login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add explicit deny for unauthenticated reads
CREATE POLICY "Deny unauthenticated read access to login attempts"
ON public.login_attempts
FOR SELECT
TO anon
USING (false);

-- Keep INSERT policy as is (needed for auth flow tracking)
-- But add a controlled RPC function for inserting login attempts

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  _email text,
  _success boolean,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user_id if user exists
  SELECT id INTO _user_id
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;

  -- Insert login attempt with rate limiting check
  -- Prevent excessive failed attempts from same IP in short time
  IF _success = false THEN
    -- Check if there are too many recent failed attempts from this IP
    DECLARE
      recent_failed_count integer;
    BEGIN
      SELECT COUNT(*) INTO recent_failed_count
      FROM public.login_attempts
      WHERE ip_address = _ip_address
        AND success = false
        AND attempt_time > (now() - interval '1 minute');
      
      -- Allow max 10 failed attempts per minute from same IP
      IF recent_failed_count >= 10 THEN
        RAISE NOTICE 'Rate limit exceeded for IP %', _ip_address;
        RETURN; -- Silently ignore excessive attempts
      END IF;
    END;
  END IF;

  INSERT INTO public.login_attempts (
    email,
    user_id,
    success,
    ip_address,
    user_agent,
    attempt_time
  ) VALUES (
    _email,
    _user_id,
    _success,
    _ip_address,
    _user_agent,
    now()
  );
END;
$$;

COMMENT ON FUNCTION public.record_login_attempt(text, boolean, text, text) IS 
'Controlled function to record login attempts with rate limiting to prevent flooding attacks. Use this instead of direct INSERT.';

-- ==========================================
-- LOCKED_ACCOUNTS TABLE PROTECTION
-- ==========================================

-- Drop the problematic "System can insert locked accounts" policy
DROP POLICY IF EXISTS "System can insert locked accounts" ON public.locked_accounts;

-- Add explicit SELECT policy
DROP POLICY IF EXISTS "SA can select locked accounts" ON public.locked_accounts;

CREATE POLICY "Only super admins can read locked accounts"
ON public.locked_accounts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add explicit deny for unauthenticated reads
CREATE POLICY "Deny unauthenticated read access to locked accounts"
ON public.locked_accounts
FOR SELECT
TO anon
USING (false);

-- Add explicit deny for unauthenticated writes
CREATE POLICY "Deny unauthenticated write access to locked accounts"
ON public.locked_accounts
FOR INSERT
TO anon
WITH CHECK (false);

-- Only allow INSERT/UPDATE/DELETE through specific functions
-- The lock_account_for_email function already exists and is SECURITY DEFINER
-- Add explicit policy that only allows INSERT from authenticated super admins or through functions
CREATE POLICY "Only system functions can insert locked accounts"
ON public.locked_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only super_admin or through SECURITY DEFINER functions can insert
  is_super_admin(auth.uid())
);

-- Keep existing UPDATE and DELETE policies for super_admin
-- (already exist: "SA can update locked accounts", "SA can delete locked accounts")

-- ==========================================
-- AUDIT LOGGING FOR SECURITY EVENTS
-- ==========================================

-- Log when accounts are locked (already partially implemented via lock_account_for_email)
-- Add trigger to log security events
CREATE OR REPLACE FUNCTION public.log_account_lock_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.logs (
      entity_type,
      entity_id,
      action,
      user_id,
      new_values
    ) VALUES (
      'locked_account',
      NEW.id,
      'account_locked',
      NEW.unlocked_by,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'reason', NEW.reason,
        'locked_by_system', NEW.locked_by_system,
        'locked_until', NEW.locked_until
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.logs (
      entity_type,
      entity_id,
      action,
      user_id,
      previous_values
    ) VALUES (
      'locked_account',
      OLD.id,
      'account_unlocked',
      OLD.unlocked_by,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'reason', OLD.reason,
        'locked_at', OLD.locked_at
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_account_lock_events ON public.locked_accounts;
CREATE TRIGGER audit_account_lock_events
  AFTER INSERT OR DELETE ON public.locked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_account_lock_events();

COMMENT ON TRIGGER audit_account_lock_events ON public.locked_accounts IS 
'Logs all account locking and unlocking events to audit trail for security monitoring.';