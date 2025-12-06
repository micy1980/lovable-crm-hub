-- Add number formatting settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('use_system_locale_formatting', 'true', 'Use browser locale for number formatting'),
  ('number_thousand_separator', ' ', 'Thousand separator character'),
  ('number_decimal_separator', ',', 'Decimal separator character')
ON CONFLICT (setting_key) DO NOTHING;