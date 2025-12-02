-- Add EU VAT number column to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS eu_vat_number text;

-- Create partner user access restriction table
CREATE TABLE public.partner_user_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(partner_id, user_id)
);

-- Add restriction toggle to partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS restrict_access boolean DEFAULT false;

-- Enable RLS
ALTER TABLE public.partner_user_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_user_access
CREATE POLICY "Users can view access records for their company partners"
  ON public.partner_user_access
  FOR SELECT
  USING (
    is_2fa_verified(auth.uid()) AND
    (is_super_admin(auth.uid()) OR company_id IN (
      SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins can manage access records in their companies"
  ON public.partner_user_access
  FOR ALL
  USING (
    is_2fa_verified(auth.uid()) AND
    is_admin_or_above(auth.uid()) AND
    (is_super_admin(auth.uid()) OR company_id IN (
      SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    is_2fa_verified(auth.uid()) AND
    is_admin_or_above(auth.uid()) AND
    (is_super_admin(auth.uid()) OR company_id IN (
      SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
    ))
  );

-- Update partners RLS to check user access restrictions
DROP POLICY IF EXISTS "Users can view partners in their companies" ON public.partners;

CREATE POLICY "Users can view partners in their companies with access check"
  ON public.partners
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    is_2fa_verified(auth.uid()) AND
    (
      is_super_admin(auth.uid()) OR
      (
        company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()) AND
        (
          restrict_access = false OR
          restrict_access IS NULL OR
          EXISTS (
            SELECT 1 FROM partner_user_access pua 
            WHERE pua.partner_id = partners.id AND pua.user_id = auth.uid()
          ) OR
          is_admin_or_above(auth.uid())
        )
      )
    )
  );