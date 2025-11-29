-- Add must_change_password column to profiles table
ALTER TABLE public.profiles ADD COLUMN must_change_password BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.must_change_password IS 'When true, user must change password on next login';
