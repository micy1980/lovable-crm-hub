-- Fix lock_account_for_email to actually create lock records
-- Remove ON CONFLICT DO NOTHING since there's no unique constraint
-- Instead, check if account is already locked before inserting
CREATE OR REPLACE FUNCTION public.lock_account_for_email(_email text, _minutes integer, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _already_locked boolean;
BEGIN
  -- Get user ID by email
  SELECT id INTO _user_id
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;

  -- If user doesn't exist, return
  IF _user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', _email;
    RETURN;
  END IF;

  -- Check if already locked
  SELECT EXISTS (
    SELECT 1
    FROM public.locked_accounts
    WHERE user_id = _user_id
      AND unlocked_at IS NULL
      AND (locked_until IS NULL OR locked_until > now())
  ) INTO _already_locked;

  -- If already locked, don't create duplicate
  IF _already_locked THEN
    RAISE NOTICE 'User % is already locked', _email;
    RETURN;
  END IF;

  -- Create lock record
  INSERT INTO public.locked_accounts (
    user_id, 
    locked_by_system, 
    locked_until, 
    reason
  )
  VALUES (
    _user_id,
    true,
    now() + make_interval(mins => COALESCE(_minutes, 30)),
    COALESCE(_reason, 'Too many failed login attempts')
  );
  
  RAISE NOTICE 'Locked account for user % (user_id: %)', _email, _user_id;
END;
$function$;