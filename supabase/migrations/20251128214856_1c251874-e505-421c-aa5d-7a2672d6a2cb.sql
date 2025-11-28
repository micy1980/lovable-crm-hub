-- Reliable account lock helper that bypasses RLS fully
CREATE OR REPLACE FUNCTION public.lock_account_for_email(
  _email text,
  _minutes integer,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;

  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.locked_accounts (user_id, locked_by_system, locked_until, reason)
  VALUES (
    _user_id,
    true,
    now() + make_interval(mins => COALESCE(_minutes, 30)),
    COALESCE(_reason, 'Too many failed login attempts')
  )
  ON CONFLICT DO NOTHING;
END;
$$;