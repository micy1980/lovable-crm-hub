-- ================================================
-- 1) CONFIGURABLE 2FA SESSION LIFETIME
-- ================================================

-- Add system settings for 2FA configuration
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('two_factor_session_duration_minutes', '720', '2FA session duration in minutes (default: 12 hours)'),
  ('two_factor_max_attempts', '10', 'Maximum failed 2FA attempts before lockout'),
  ('two_factor_window_minutes', '10', 'Time window for counting failed 2FA attempts'),
  ('two_factor_lock_minutes', '10', 'Duration of 2FA lockout after too many failures')
ON CONFLICT (setting_key) DO NOTHING;

-- Helper function to get 2FA settings
CREATE OR REPLACE FUNCTION public.get_2fa_settings()
RETURNS TABLE(
  session_duration_minutes integer,
  max_attempts integer,
  window_minutes integer,
  lock_minutes integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'two_factor_session_duration_minutes' LIMIT 1),
      720
    ) AS session_duration_minutes,
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'two_factor_max_attempts' LIMIT 1),
      10
    ) AS max_attempts,
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'two_factor_window_minutes' LIMIT 1),
      10
    ) AS window_minutes,
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'two_factor_lock_minutes' LIMIT 1),
      10
    ) AS lock_minutes;
END;
$$;

COMMENT ON FUNCTION public.get_2fa_settings() IS 'Returns current 2FA configuration settings';

GRANT EXECUTE ON FUNCTION public.get_2fa_settings() TO anon, authenticated;

-- ================================================
-- 2) INVALIDATE 2FA VERIFICATIONS ON PASSWORD CHANGE / DISABLE 2FA
-- ================================================

-- Function to invalidate all 2FA verifications for a user
CREATE OR REPLACE FUNCTION public.invalidate_2fa_verifications(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.session_2fa_verifications
  WHERE user_id = _user_id;
$$;

COMMENT ON FUNCTION public.invalidate_2fa_verifications(uuid) 
IS 'Deletes all 2FA session verifications for the given user. Internal use only (service role).';

-- Revoke from public to prevent client calls
REVOKE ALL ON FUNCTION public.invalidate_2fa_verifications(uuid) FROM PUBLIC, anon, authenticated;

-- Function for users to invalidate their own 2FA verifications (used after password change)
CREATE OR REPLACE FUNCTION public.invalidate_own_2fa_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.invalidate_2fa_verifications(uid);
END;
$$;

COMMENT ON FUNCTION public.invalidate_own_2fa_verifications() 
IS 'Allows authenticated users to invalidate their own 2FA session verifications (e.g., after password change)';

GRANT EXECUTE ON FUNCTION public.invalidate_own_2fa_verifications() TO authenticated;

-- Update disable_2fa to also invalidate sessions
CREATE OR REPLACE FUNCTION public.disable_2fa(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can disable their own 2FA, or SA can disable anyone's
  IF auth.uid() != _user_id AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET two_factor_enabled = false,
      two_factor_secret = NULL
  WHERE id = _user_id;

  -- Delete all recovery codes when 2FA is disabled
  DELETE FROM public.user_recovery_codes
  WHERE user_id = _user_id;
  
  -- Invalidate all active 2FA sessions
  PERFORM public.invalidate_2fa_verifications(_user_id);
END;
$$;

-- ================================================
-- 3) RATE LIMITING / LOCKOUT FOR 2FA ATTEMPTS
-- ================================================

-- Table to track 2FA attempts
CREATE TABLE IF NOT EXISTS public.two_factor_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  ip_address text,
  CONSTRAINT two_factor_attempts_user_fk FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_two_factor_attempts_user_id_attempted_at 
ON public.two_factor_attempts(user_id, attempted_at DESC);

ALTER TABLE public.two_factor_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own attempts
CREATE POLICY "Users can view their own 2FA attempts"
ON public.two_factor_attempts
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON TABLE public.two_factor_attempts IS 'Tracks all 2FA verification attempts for rate limiting';

-- Table to track 2FA locks
CREATE TABLE IF NOT EXISTS public.two_factor_locks (
  user_id uuid PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  reason text,
  locked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT two_factor_locks_user_fk FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE CASCADE
);

ALTER TABLE public.two_factor_locks ENABLE ROW LEVEL SECURITY;

-- Users can view their own lock status
CREATE POLICY "Users can view their own 2FA lock status"
ON public.two_factor_locks
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON TABLE public.two_factor_locks IS 'Tracks users locked out from 2FA due to too many failed attempts';

-- Function to check if user is locked from 2FA attempts
CREATE OR REPLACE FUNCTION public.is_two_factor_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.two_factor_locks
    WHERE user_id = _user_id
      AND locked_until > now()
  );
$$;

COMMENT ON FUNCTION public.is_two_factor_locked(uuid) IS 'Checks if a user is currently locked from 2FA attempts';

GRANT EXECUTE ON FUNCTION public.is_two_factor_locked(uuid) TO anon, authenticated;

-- Function to apply 2FA lock if too many failed attempts
CREATE OR REPLACE FUNCTION public.apply_two_factor_lock_if_needed(
  _user_id uuid,
  _max_attempts integer,
  _window_minutes integer,
  _lock_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts_count integer;
BEGIN
  -- Count recent failed attempts
  SELECT COUNT(*) INTO failed_attempts_count
  FROM public.two_factor_attempts
  WHERE user_id = _user_id
    AND success = false
    AND attempted_at > (now() - (_window_minutes || ' minutes')::interval);

  -- If threshold exceeded, lock the user
  IF failed_attempts_count >= _max_attempts THEN
    INSERT INTO public.two_factor_locks (user_id, locked_until, reason)
    VALUES (
      _user_id, 
      now() + (_lock_minutes || ' minutes')::interval, 
      'Too many invalid 2FA attempts'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET locked_until = EXCLUDED.locked_until,
          locked_at = now(),
          reason = EXCLUDED.reason;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.apply_two_factor_lock_if_needed(uuid, integer, integer, integer) 
IS 'Locks a user from 2FA if they have exceeded the maximum failed attempts. Internal use only (service role).';

-- Revoke from public to prevent client calls
REVOKE ALL ON FUNCTION public.apply_two_factor_lock_if_needed(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;

-- Function to clear expired 2FA locks (for cleanup jobs)
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_locks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.two_factor_locks
  WHERE locked_until < now();
$$;

COMMENT ON FUNCTION public.cleanup_expired_2fa_locks() IS 'Removes expired 2FA locks. Should be called periodically.';