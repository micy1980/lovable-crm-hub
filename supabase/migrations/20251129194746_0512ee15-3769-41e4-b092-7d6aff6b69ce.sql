-- Create trigger to automatically clear failed login attempts on successful login
CREATE TRIGGER clear_failed_attempts_on_success_trigger
  AFTER INSERT ON public.login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_failed_attempts_on_success();

-- Add system setting for failed attempts time window (in minutes)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'account_lock_failed_attempts_window_minutes',
  '5',
  'Time window in minutes to count failed login attempts before locking account'
)
ON CONFLICT (setting_key) DO NOTHING;