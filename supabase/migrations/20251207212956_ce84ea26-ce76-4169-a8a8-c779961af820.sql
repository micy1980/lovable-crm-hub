-- Add deleted_at column for soft delete
ALTER TABLE public.comments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update SELECT policy to exclude soft deleted comments
DROP POLICY IF EXISTS "Users can view comments in their companies" ON public.comments;
CREATE POLICY "Users can view comments in their companies" ON public.comments
FOR SELECT USING (
  deleted_at IS NULL AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_companies uc 
      WHERE uc.user_id = auth.uid() AND uc.company_id = comments.company_id
    )
  )
);

-- Update DELETE policy to soft delete only (we'll use UPDATE for soft delete)
DROP POLICY IF EXISTS "Users can delete their own comments or admins can delete any" ON public.comments;

-- Add policy for soft delete (user can set deleted_at on their own comments)
CREATE POLICY "Users can soft delete their own comments" ON public.comments
FOR UPDATE USING (
  auth.uid() = user_id AND deleted_at IS NULL
) WITH CHECK (
  auth.uid() = user_id
);