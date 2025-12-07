-- Create partner_contacts table for contact persons
CREATE TABLE public.partner_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  email text,
  phone text,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add parent_partner_id to partners table for hierarchical relationships
ALTER TABLE public.partners 
ADD COLUMN parent_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Enable RLS on partner_contacts
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_contacts
CREATE POLICY "Users can view contacts for accessible partners"
ON public.partner_contacts
FOR SELECT
USING (
  is_2fa_verified(auth.uid()) AND (
    is_super_admin(auth.uid()) OR
    (company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()))
  )
);

CREATE POLICY "Admins can manage contacts"
ON public.partner_contacts
FOR ALL
USING (
  is_2fa_verified(auth.uid()) AND 
  is_admin_or_above(auth.uid()) AND (
    is_super_admin(auth.uid()) OR
    (company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()))
  )
)
WITH CHECK (
  is_2fa_verified(auth.uid()) AND 
  is_admin_or_above(auth.uid()) AND (
    is_super_admin(auth.uid()) OR
    (company_id IN (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()))
  )
);

-- Add index for faster lookups
CREATE INDEX idx_partner_contacts_partner_id ON public.partner_contacts(partner_id);
CREATE INDEX idx_partners_parent_partner_id ON public.partners(parent_partner_id);

-- Enable realtime for partner_contacts
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_contacts;