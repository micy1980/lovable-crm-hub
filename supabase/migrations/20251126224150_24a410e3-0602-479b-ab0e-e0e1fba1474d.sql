-- Fix infinite recursion in profiles RLS policy
-- Drop the policy that causes recursive SELECT from profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a simpler policy without recursive queries
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = id
    AND deleted_at IS NULL
  );