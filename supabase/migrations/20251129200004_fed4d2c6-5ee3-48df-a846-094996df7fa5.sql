-- Drop and recreate unlock function to DELETE the lock record instead of just marking it unlocked
DROP FUNCTION IF EXISTS public.unlock_account_by_user_id(uuid, uuid);

CREATE OR REPLACE FUNCTION public.unlock_account_by_user_id(_user_id uuid, _unlocked_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete the locked_accounts record completely
  DELETE FROM public.locked_accounts
  WHERE user_id = _user_id
    AND unlocked_at IS NULL;
  
  -- Clear recent failed login attempts (last 24 hours) for this user
  DELETE FROM public.login_attempts
  WHERE user_id = _user_id
    AND success = false
    AND attempt_time > (now() - interval '24 hours');
END;
$$;

-- Create function to clean up expired/unlocked lock records
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Delete lock records where:
  -- 1. Lock time has expired (locked_until < now())
  -- 2. Or manually unlocked (unlocked_at IS NOT NULL)
  DELETE FROM public.locked_accounts
  WHERE locked_until < now()
     OR unlocked_at IS NOT NULL;
$$;

-- Create function to update existing locks when auto_unlock_minutes setting changes
CREATE OR REPLACE FUNCTION public.adjust_active_locks_duration(_new_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update locked_until for all active (not yet unlocked) locks
  -- New locked_until = locked_at + new duration
  UPDATE public.locked_accounts
  SET locked_until = locked_at + make_interval(mins => _new_minutes)
  WHERE unlocked_at IS NULL
    AND locked_until > now();  -- Only update locks that are still active
END;
$$;