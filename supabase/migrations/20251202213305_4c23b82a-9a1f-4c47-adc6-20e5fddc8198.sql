
-- Create partner_addresses table for headquarters and site addresses
CREATE TABLE public.partner_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL CHECK (address_type IN ('headquarters', 'site')),
  country TEXT,
  county TEXT,
  postal_code TEXT,
  city TEXT,
  street_name TEXT,
  street_type TEXT,
  house_number TEXT,
  plot_number TEXT,
  building TEXT,
  staircase TEXT,
  floor_door TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(partner_id, address_type)
);

-- Add default_currency to partners table
ALTER TABLE public.partners ADD COLUMN default_currency TEXT DEFAULT 'HUF';

-- Create master data for street types
INSERT INTO public.master_data (type, value, label, order_index) VALUES
  ('STREET_TYPE', 'utca', 'utca', 1),
  ('STREET_TYPE', 'út', 'út', 2),
  ('STREET_TYPE', 'tér', 'tér', 3),
  ('STREET_TYPE', 'köz', 'köz', 4),
  ('STREET_TYPE', 'körút', 'körút', 5),
  ('STREET_TYPE', 'sugárút', 'sugárút', 6),
  ('STREET_TYPE', 'sétány', 'sétány', 7),
  ('STREET_TYPE', 'sor', 'sor', 8),
  ('STREET_TYPE', 'dűlő', 'dűlő', 9),
  ('STREET_TYPE', 'lakótelep', 'lakótelep', 10),
  ('STREET_TYPE', 'park', 'park', 11);

-- Create master data for countries (starting with common ones)
INSERT INTO public.master_data (type, value, label, order_index) VALUES
  ('COUNTRY', 'HU', 'Magyarország', 1),
  ('COUNTRY', 'AT', 'Ausztria', 2),
  ('COUNTRY', 'DE', 'Németország', 3),
  ('COUNTRY', 'SK', 'Szlovákia', 4),
  ('COUNTRY', 'RO', 'Románia', 5),
  ('COUNTRY', 'HR', 'Horvátország', 6),
  ('COUNTRY', 'SI', 'Szlovénia', 7),
  ('COUNTRY', 'RS', 'Szerbia', 8),
  ('COUNTRY', 'UA', 'Ukrajna', 9),
  ('COUNTRY', 'CZ', 'Csehország', 10);

-- Create master data for Hungarian counties
INSERT INTO public.master_data (type, value, label, order_index) VALUES
  ('COUNTY', 'budapest', 'Budapest', 1),
  ('COUNTY', 'bacs-kiskun', 'Bács-Kiskun', 2),
  ('COUNTY', 'baranya', 'Baranya', 3),
  ('COUNTY', 'bekes', 'Békés', 4),
  ('COUNTY', 'borsod-abauj-zemplen', 'Borsod-Abaúj-Zemplén', 5),
  ('COUNTY', 'csongrad-csanad', 'Csongrád-Csanád', 6),
  ('COUNTY', 'fejer', 'Fejér', 7),
  ('COUNTY', 'gyor-moson-sopron', 'Győr-Moson-Sopron', 8),
  ('COUNTY', 'hajdu-bihar', 'Hajdú-Bihar', 9),
  ('COUNTY', 'heves', 'Heves', 10),
  ('COUNTY', 'jasz-nagykun-szolnok', 'Jász-Nagykun-Szolnok', 11),
  ('COUNTY', 'komarom-esztergom', 'Komárom-Esztergom', 12),
  ('COUNTY', 'nograd', 'Nógrád', 13),
  ('COUNTY', 'pest', 'Pest', 14),
  ('COUNTY', 'somogy', 'Somogy', 15),
  ('COUNTY', 'szabolcs-szatmar-bereg', 'Szabolcs-Szatmár-Bereg', 16),
  ('COUNTY', 'tolna', 'Tolna', 17),
  ('COUNTY', 'vas', 'Vas', 18),
  ('COUNTY', 'veszprem', 'Veszprém', 19),
  ('COUNTY', 'zala', 'Zala', 20);

-- Enable RLS on partner_addresses
ALTER TABLE public.partner_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_addresses
CREATE POLICY "Users can view partner addresses for accessible partners"
ON public.partner_addresses FOR SELECT
USING (
  is_2fa_verified(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_addresses.partner_id
    AND p.deleted_at IS NULL
    AND (
      is_super_admin(auth.uid()) OR
      (
        p.company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid())
        AND (
          p.restrict_access = false OR
          p.restrict_access IS NULL OR
          EXISTS (SELECT 1 FROM partner_user_access pua WHERE pua.partner_id = p.id AND pua.user_id = auth.uid()) OR
          is_admin_or_above(auth.uid())
        )
      )
    )
  )
);

CREATE POLICY "Admins can manage partner addresses"
ON public.partner_addresses FOR ALL
USING (
  is_2fa_verified(auth.uid()) AND
  is_admin_or_above(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_addresses.partner_id
    AND (
      is_super_admin(auth.uid()) OR
      p.company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid())
    )
  )
)
WITH CHECK (
  is_2fa_verified(auth.uid()) AND
  is_admin_or_above(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_addresses.partner_id
    AND (
      is_super_admin(auth.uid()) OR
      p.company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid())
    )
  )
);
