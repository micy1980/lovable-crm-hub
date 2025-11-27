-- Make user_code nullable with a temporary default so the trigger can create profiles
-- The edge function will then update it with the unique code
ALTER TABLE public.profiles 
ALTER COLUMN user_code DROP NOT NULL;

ALTER TABLE public.profiles 
ALTER COLUMN user_code SET DEFAULT '';