-- ============================================
-- Account Lockout System Improvements
-- ============================================

-- 1. Ensure system settings exist with proper defaults
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('account_lock_attempts', '5', 'Number of failed login attempts before account lock')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('account_lock_auto_unlock_minutes', '30', 'Minutes until automatic account unlock after lock')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Create a unique constraint on locked_accounts.user_id if not exists
-- This ensures only one lock record per user
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'locked_accounts_user_id_key'
  ) THEN
    ALTER TABLE public.locked_accounts 
    ADD CONSTRAINT locked_accounts_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Improve the unlock function to also clear recent failed login attempts
CREATE OR REPLACE FUNCTION public.unlock_account_by_user_id(_user_id uuid, _unlocked_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the locked_accounts record
  UPDATE public.locked_accounts
  SET unlocked_at = now(),
      unlocked_by = _unlocked_by
  WHERE user_id = _user_id
    AND unlocked_at IS NULL;
  
  -- Clear recent failed login attempts (last 24 hours) for this user
  -- This prevents immediate re-lock if user tries wrong password again
  DELETE FROM public.login_attempts
  WHERE user_id = _user_id
    AND success = false
    AND attempt_time > (now() - interval '24 hours');
END;
$function$;

-- 4. Create a function to automatically clear old login attempts (housekeeping)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.login_attempts
  WHERE attempt_time < (now() - interval '30 days');
$function$;

-- 5. Create a function to clear login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_failed_attempts_on_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If this is a successful login and user exists
  IF NEW.success = true AND NEW.user_id IS NOT NULL THEN
    -- Delete recent failed attempts for this user
    DELETE FROM public.login_attempts
    WHERE user_id = NEW.user_id
      AND success = false
      AND attempt_time > (now() - interval '24 hours');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. Create trigger to auto-clear failed attempts on successful login
DROP TRIGGER IF EXISTS trigger_clear_failed_attempts ON public.login_attempts;
CREATE TRIGGER trigger_clear_failed_attempts
  AFTER INSERT ON public.login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_failed_attempts_on_success();

-- 7. Ensure locked_accounts table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_locked_accounts_lookup 
  ON public.locked_accounts(user_id, unlocked_at, locked_until);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
  ON public.login_attempts(email, attempt_time DESC) 
  WHERE success = false;