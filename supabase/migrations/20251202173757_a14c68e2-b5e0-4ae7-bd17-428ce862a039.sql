-- Add password_changed_at column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone DEFAULT now();

-- Set existing users' password_changed_at to their created_at if null
UPDATE public.profiles 
SET password_changed_at = COALESCE(created_at, now()) 
WHERE password_changed_at IS NULL;

-- Create function to check if password is expired (default 90 days)
CREATE OR REPLACE FUNCTION public.is_password_expired(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (now() - COALESCE(password_changed_at, created_at)) > 
             (COALESCE(
               (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'password_expiry_days' LIMIT 1),
               90
             ) || ' days')::interval
      FROM public.profiles
      WHERE id = _user_id
    ),
    false
  );
$$;

-- Create function to update password_changed_at timestamp
CREATE OR REPLACE FUNCTION public.update_password_changed_at(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET password_changed_at = now(),
      must_change_password = false
  WHERE id = _user_id;
END;
$$;