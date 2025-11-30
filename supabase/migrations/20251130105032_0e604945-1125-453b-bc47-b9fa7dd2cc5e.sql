-- Add 2FA columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret text DEFAULT NULL;

-- Create function to generate random base32 secret for 2FA
CREATE OR REPLACE FUNCTION public.generate_2fa_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret text;
  base32_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  i integer;
BEGIN
  secret := '';
  FOR i IN 1..32 LOOP
    secret := secret || substr(base32_chars, floor(random() * 32 + 1)::integer, 1);
  END LOOP;
  RETURN secret;
END;
$$;

-- Function to enable 2FA for a user
CREATE OR REPLACE FUNCTION public.enable_2fa(_user_id uuid, _secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only user can enable their own 2FA
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET two_factor_enabled = true,
      two_factor_secret = _secret
  WHERE id = _user_id;
END;
$$;

-- Function to disable 2FA for a user
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
END;
$$;

-- Function to get user's 2FA status (for own user only or SA)
CREATE OR REPLACE FUNCTION public.get_2fa_status(_user_id uuid)
RETURNS TABLE(
  two_factor_enabled boolean,
  has_recovery_codes boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only user can see their own 2FA status, or SA can see anyone's
  IF auth.uid() != _user_id AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.two_factor_enabled,
    EXISTS(
      SELECT 1 
      FROM public.user_recovery_codes urc 
      WHERE urc.user_id = _user_id AND urc.used = false
    ) as has_recovery_codes
  FROM public.profiles p
  WHERE p.id = _user_id;
END;
$$;

-- Function to verify 2FA secret exists for user (login check)
CREATE OR REPLACE FUNCTION public.user_has_2fa_enabled(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT two_factor_enabled 
     FROM public.profiles 
     WHERE email = _email 
     AND two_factor_enabled = true
     LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.generate_2fa_secret() IS 'Generates a random base32 secret for TOTP 2FA';
COMMENT ON FUNCTION public.enable_2fa(_user_id uuid, _secret text) IS 'Enables 2FA for a user with the provided secret';
COMMENT ON FUNCTION public.disable_2fa(_user_id uuid) IS 'Disables 2FA for a user and deletes recovery codes';
COMMENT ON FUNCTION public.get_2fa_status(_user_id uuid) IS 'Returns 2FA status for a user';
COMMENT ON FUNCTION public.user_has_2fa_enabled(_email text) IS 'Checks if user has 2FA enabled by email';