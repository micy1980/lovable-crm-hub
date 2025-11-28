-- Create system_settings table for global app settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read settings
CREATE POLICY "Super admins can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Only super admins can update settings
CREATE POLICY "Super admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can insert settings
CREATE POLICY "Super admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Insert default auto-logout timeout (5 minutes = 300 seconds)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('auto_logout_timeout', '300', 'Auto logout timeout in seconds (default: 300 = 5 minutes)')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();