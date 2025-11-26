-- Add language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN language TEXT CHECK (language IN ('en', 'hu'));

COMMENT ON COLUMN public.profiles.language IS 'User preferred UI language: en (English) or hu (Hungarian)';