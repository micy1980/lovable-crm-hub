-- Drop the conflicting policy
DROP POLICY IF EXISTS "Users can soft delete their own comments" ON public.comments;

-- Update the existing policy to allow both content edits and soft delete
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE USING (
  auth.uid() = user_id AND deleted_at IS NULL
) WITH CHECK (
  auth.uid() = user_id
);