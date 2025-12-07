-- Create document_templates table for storing reusable document templates
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- offer, contract, protocol, other
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  variables JSONB DEFAULT '[]'::jsonb, -- list of variable placeholders in template
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view templates in their companies"
ON public.document_templates
FOR SELECT
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  (is_super_admin(auth.uid()) OR company_id IN (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can create templates"
ON public.document_templates
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid()) AND
  is_admin_or_above(auth.uid()) AND
  (is_super_admin(auth.uid()) OR company_id IN (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can update templates"
ON public.document_templates
FOR UPDATE
USING (
  is_2fa_verified(auth.uid()) AND
  is_admin_or_above(auth.uid()) AND
  deleted_at IS NULL AND
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

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add master data for template categories
INSERT INTO master_data (type, value, label, order_index) VALUES
('template_category', 'offer', 'Ajánlat', 1),
('template_category', 'contract', 'Szerződés', 2),
('template_category', 'protocol', 'Jegyzőkönyv', 3),
('template_category', 'letter', 'Levél', 4),
('template_category', 'other', 'Egyéb', 5)
ON CONFLICT DO NOTHING;