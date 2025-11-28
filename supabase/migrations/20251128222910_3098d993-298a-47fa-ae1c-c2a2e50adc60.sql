-- Make lock_account_for_email robust with unique user_id constraint
CREATE OR REPLACE FUNCTION public.lock_account_for_email(_email text, _minutes integer, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user ID by email
  SELECT id INTO _user_id
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;

  -- If user doesn't exist, just exit silently
  IF _user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', _email;
    RETURN;
  END IF;

  -- Upsert-style lock: single row per user, reused on every lock
  INSERT INTO public.locked_accounts (
    user_id,
    locked_by_system,
    locked_at,
    locked_until,
    reason,
    unlocked_at,
    unlocked_by
  ) VALUES (
    _user_id,
    true,
    now(),
    now() + make_interval(mins => COALESCE(_minutes, 30)),
    COALESCE(_reason, 'Too many failed login attempts'),
    NULL,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
    SET locked_by_system = EXCLUDED.locked_by_system,
        locked_at       = EXCLUDED.locked_at,
        locked_until    = EXCLUDED.locked_until,
        reason          = EXCLUDED.reason,
        unlocked_at     = NULL,
        unlocked_by     = NULL;

  RAISE NOTICE 'Account locked (or re-locked) for user % (user_id: %)', _email, _user_id;
END;
$function$;