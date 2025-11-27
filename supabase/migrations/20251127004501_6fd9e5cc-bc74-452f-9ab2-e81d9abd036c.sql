-- Set user_code default to NULL instead of empty string to avoid unique constraint violations
ALTER TABLE public.profiles 
ALTER COLUMN user_code SET DEFAULT NULL;