-- Add family_name and given_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS family_name TEXT,
ADD COLUMN IF NOT EXISTS given_name TEXT;

-- For existing users, try to split full_name if it exists
-- This is a best-effort migration - assumes "Last First" format
UPDATE public.profiles
SET 
  family_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  given_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE family_name IS NULL AND given_name IS NULL;