-- Create a SECURITY DEFINER function for soft deleting comments
CREATE OR REPLACE FUNCTION public.soft_delete_comment(comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the comment
  IF NOT EXISTS (
    SELECT 1 FROM comments 
    WHERE id = comment_id 
    AND user_id = auth.uid() 
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Comment not found or you do not have permission to delete it';
  END IF;

  -- Perform soft delete
  UPDATE comments 
  SET deleted_at = now() 
  WHERE id = comment_id;
END;
$$;