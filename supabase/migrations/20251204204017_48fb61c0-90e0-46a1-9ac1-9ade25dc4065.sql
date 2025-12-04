-- Add registration-related fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invitation_sent_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invitation_token text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invitation_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registered_at timestamp with time zone DEFAULT NULL;

-- Create function to generate new invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token text;
  token_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
BEGIN
  token := '';
  FOR i IN 1..8 LOOP
    token := token || substr(token_chars, floor(random() * 32 + 1)::integer, 1);
  END LOOP;
  RETURN token;
END;
$$;

-- Create function to send invitation (updates profile with new token)
CREATE OR REPLACE FUNCTION public.prepare_user_invitation(_user_id uuid)
RETURNS TABLE(token text, email text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_token text;
  new_expires_at timestamp with time zone;
  user_email text;
BEGIN
  -- Only SA can prepare invitations
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can send invitations';
  END IF;

  -- Check if user already registered
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND registered_at IS NOT NULL) THEN
    RAISE EXCEPTION 'User already registered';
  END IF;

  -- Generate new token and expiry
  new_token := generate_invitation_token();
  new_expires_at := now() + interval '24 hours';

  -- Get user email
  SELECT p.email INTO user_email FROM public.profiles p WHERE p.id = _user_id;

  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update profile with new invitation data
  UPDATE public.profiles
  SET invitation_token = new_token,
      invitation_sent_at = now(),
      invitation_expires_at = new_expires_at,
      user_code = COALESCE(user_code, generate_invitation_token())
  WHERE id = _user_id;

  RETURN QUERY SELECT new_token, user_email, new_expires_at;
END;
$$;

-- Create function to validate invitation and complete registration
CREATE OR REPLACE FUNCTION public.complete_registration(
  _email text,
  _user_code text,
  _full_name text,
  _family_name text,
  _given_name text,
  _password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record record;
  user_id_result uuid;
BEGIN
  -- Find user by email and validate code
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE email = _email
    AND user_code = _user_code
    AND invitation_expires_at > now()
    AND registered_at IS NULL
  LIMIT 1;

  IF profile_record IS NULL THEN
    -- Check if already registered
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = _email AND registered_at IS NOT NULL) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_registered');
    END IF;
    -- Check if code is wrong or expired
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = _email AND invitation_expires_at <= now()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'invitation_expired');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Update profile with registration data
  UPDATE public.profiles
  SET full_name = _full_name,
      family_name = _family_name,
      given_name = _given_name,
      registered_at = now(),
      is_active = true
  WHERE id = profile_record.id;

  RETURN jsonb_build_object(
    'success', true, 
    'user_id', profile_record.id
  );
END;
$$;