-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;

-- Create a new update policy that allows both content edits and soft delete
CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);