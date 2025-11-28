-- Add function to check if an account is locked by email (for login screen)
CREATE OR REPLACE FUNCTION public.is_account_locked_by_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.locked_accounts la
    JOIN public.profiles p ON p.id = la.user_id
    WHERE p.email = _email
      AND la.unlocked_at IS NULL
      AND (la.locked_until IS NULL OR la.locked_until > now())
  );
$$;