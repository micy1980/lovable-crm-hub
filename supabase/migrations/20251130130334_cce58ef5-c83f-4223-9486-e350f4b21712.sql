-- Security definer function to check if user has completed 2FA verification
-- This checks both: if 2FA is enabled, and if yes, whether it's been verified in the current session
CREATE OR REPLACE FUNCTION public.is_2fa_verified(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_2fa_enabled boolean;
  session_2fa_verified boolean;
  session_2fa_timestamp timestamptz;
BEGIN
  -- Get user's 2FA status
  SELECT two_factor_enabled INTO user_2fa_enabled
  FROM public.profiles
  WHERE id = _user_id;

  -- If 2FA is not enabled, allow access
  IF user_2fa_enabled IS NULL OR user_2fa_enabled = false THEN
    RETURN true;
  END IF;

  -- If 2FA is enabled, check if current session has verified 2FA
  -- We'll check the app_metadata in the JWT token via auth.jwt()
  session_2fa_verified := COALESCE((auth.jwt()->>'two_factor_verified')::boolean, false);
  
  -- Also check timestamp (optional: sessions expire 2FA verification after some time)
  session_2fa_timestamp := (auth.jwt()->>'two_factor_verified_at')::timestamptz;
  
  -- For now, just check the flag (you can add timestamp-based expiration later)
  RETURN session_2fa_verified;
END;
$$;

-- Example of how to use this in RLS policies:
-- The function will be called like: is_2fa_verified(auth.uid())
-- It returns true if:
--   1. User doesn't have 2FA enabled, OR
--   2. User has 2FA enabled AND has verified it in the current session