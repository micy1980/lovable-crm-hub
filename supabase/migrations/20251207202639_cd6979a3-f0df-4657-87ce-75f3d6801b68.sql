-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(name, company_id)
);

-- Create entity_tags junction table
CREATE TABLE public.entity_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('partner', 'project', 'sales', 'contract', 'document', 'task', 'event')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Users can view tags in their companies"
ON public.tags FOR SELECT
USING (
  is_2fa_verified(auth.uid()) AND 
  (is_super_admin(auth.uid()) OR company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can create tags"
ON public.tags FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid()) AND 
  is_admin_or_above(auth.uid()) AND
  (is_super_admin(auth.uid()) OR company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can update tags"
ON public.tags FOR UPDATE
USING (
  is_2fa_verified(auth.uid()) AND 
  is_admin_or_above(auth.uid()) AND
  (is_super_admin(auth.uid()) OR company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can delete tags"
ON public.tags FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND 
  is_admin_or_above(auth.uid()) AND
  (is_super_admin(auth.uid()) OR company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ))
);

-- Entity_tags policies
CREATE POLICY "Users can view entity tags in their companies"
ON public.entity_tags FOR SELECT
USING (
  is_2fa_verified(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.id = entity_tags.tag_id 
    AND (is_super_admin(auth.uid()) OR t.company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can add entity tags"
ON public.entity_tags FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.id = entity_tags.tag_id 
    AND (is_super_admin(auth.uid()) OR t.company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can remove entity tags"
ON public.entity_tags FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.id = entity_tags.tag_id 
    AND (is_super_admin(auth.uid()) OR t.company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
  )
);

-- Add indexes
CREATE INDEX idx_tags_company ON public.tags(company_id);
CREATE INDEX idx_entity_tags_tag ON public.entity_tags(tag_id);
CREATE INDEX idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);

-- Foreign keys
ALTER TABLE public.tags 
ADD CONSTRAINT tags_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;