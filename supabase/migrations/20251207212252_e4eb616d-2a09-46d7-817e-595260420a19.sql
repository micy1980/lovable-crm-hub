-- Create comments table for all entities
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'partner', 'project', 'contract', 'task', 'sales', 'event', 'document'
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX idx_comments_company ON public.comments(company_id);
CREATE INDEX idx_comments_user ON public.comments(user_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access comments in their companies
CREATE POLICY "Users can view comments in their companies"
ON public.comments FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = comments.company_id
  )
);

CREATE POLICY "Users can create comments in their companies"
ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = comments.company_id
    )
  )
);

CREATE POLICY "Users can update their own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments or admins can delete any"
ON public.comments FOR DELETE
USING (
  auth.uid() = user_id
  OR is_super_admin(auth.uid())
  OR is_admin(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;