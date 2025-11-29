-- Create a security definer helper to read lock settings without exposing system_settings directly
CREATE OR REPLACE FUNCTION public.get_account_lock_settings()
RETURNS TABLE(
  max_attempts integer,
  auto_unlock_minutes integer,
  failed_window_minutes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'account_lock_attempts' LIMIT 1),
      5
    ) AS max_attempts,
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'account_lock_auto_unlock_minutes' LIMIT 1),
      30
    ) AS auto_unlock_minutes,
    COALESCE(
      (SELECT setting_value::integer FROM public.system_settings WHERE setting_key = 'account_lock_failed_attempts_window_minutes' LIMIT 1),
      15
    ) AS failed_window_minutes;
END;
$$ LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public;

-- Allow anyone (including unauthenticated login attempts) to call this function safely
GRANT EXECUTE ON FUNCTION public.get_account_lock_settings() TO anon, authenticated;