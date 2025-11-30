-- Create table to track 2FA verifications for each session
CREATE TABLE IF NOT EXISTS public.session_2fa_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE public.session_2fa_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: users can insert their own verifications
CREATE POLICY "Users can insert their own 2FA verifications"
ON public.session_2fa_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: users can view their own verifications
CREATE POLICY "Users can view their own 2FA verifications"
ON public.session_2fa_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Update the is_2fa_verified function to check the verifications table
CREATE OR REPLACE FUNCTION public.is_2fa_verified(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_2fa_enabled boolean;
  current_session_id text;
  verification_exists boolean;
BEGIN
  -- Get user's 2FA status
  SELECT two_factor_enabled INTO user_2fa_enabled
  FROM public.profiles
  WHERE id = _user_id;

  -- If 2FA is not enabled, allow access
  IF user_2fa_enabled IS NULL OR user_2fa_enabled = false THEN
    RETURN true;
  END IF;

  -- Get current session ID from JWT
  current_session_id := (auth.jwt()->>'session_id')::text;
  
  IF current_session_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if this session has a valid 2FA verification
  SELECT EXISTS (
    SELECT 1
    FROM public.session_2fa_verifications
    WHERE user_id = _user_id
      AND session_id = current_session_id
      AND expires_at > now()
  ) INTO verification_exists;
  
  RETURN verification_exists;
END;
$$;

-- Cleanup function for expired verifications (should be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_verifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  DELETE FROM public.session_2fa_verifications
  WHERE expires_at < now();
$$;