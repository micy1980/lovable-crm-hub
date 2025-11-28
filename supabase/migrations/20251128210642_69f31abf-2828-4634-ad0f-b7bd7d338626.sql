-- Recovery codes for 2FA
CREATE TABLE public.user_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery codes"
  ON public.user_recovery_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery codes"
  ON public.user_recovery_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert recovery codes"
  ON public.user_recovery_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Login attempts tracking
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL,
  attempt_time timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all login attempts"
  ON public.login_attempts FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (true);

-- Locked accounts
CREATE TABLE public.locked_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone,
  locked_by_system boolean NOT NULL DEFAULT true,
  unlocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unlocked_at timestamp with time zone,
  reason text
);

ALTER TABLE public.locked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage locked accounts"
  ON public.locked_accounts FOR ALL
  USING (is_super_admin(auth.uid()));

-- System settings default values
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('account_lock_attempts', '5', 'Sikertelen bejelentkezési kísérletek száma lockig'),
  ('account_lock_auto_unlock_minutes', '30', 'Automatikus feloldás percekben'),
  ('trial_license_days', '14', 'Globális trial licenc hossza napokban'),
  ('password_expiry_days', '90', 'Jelszó lejárati idő napokban')
ON CONFLICT (setting_key) DO NOTHING;

-- Helper function: Check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.locked_accounts
    WHERE user_id = _user_id
      AND (locked_until IS NULL OR locked_until > now())
      AND unlocked_at IS NULL
  );
$$;

-- Helper function: Count recent failed attempts
CREATE OR REPLACE FUNCTION public.count_recent_failed_attempts(_email text, _minutes integer)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.login_attempts
  WHERE email = _email
    AND success = false
    AND attempt_time > (now() - (_minutes || ' minutes')::interval);
$$;