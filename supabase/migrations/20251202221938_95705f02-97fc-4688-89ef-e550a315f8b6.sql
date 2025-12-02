-- Create postal_codes table for Hungarian addresses
CREATE TABLE IF NOT EXISTS public.postal_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  postal_code text NOT NULL,
  city text NOT NULL,
  county text,
  country text DEFAULT 'Magyarország',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.postal_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Postal codes readable by authenticated users"
  ON public.postal_codes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super admins can manage
CREATE POLICY "Super admins can manage postal codes"
  ON public.postal_codes
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_postal_codes_postal_code ON public.postal_codes (postal_code);
CREATE INDEX IF NOT EXISTS idx_postal_codes_city ON public.postal_codes (city);