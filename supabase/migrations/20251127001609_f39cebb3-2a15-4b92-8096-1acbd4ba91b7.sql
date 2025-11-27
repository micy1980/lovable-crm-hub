-- Add user_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_code TEXT;

-- Add unique constraint on user_code
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_code_key UNIQUE (user_code);

-- Backfill existing profiles with unique user codes
DO $$
DECLARE
  profile_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
  attempt INT;
  charset TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles WHERE user_code IS NULL LOOP
    attempt := 0;
    LOOP
      -- Generate random 5-character code
      new_code := '';
      FOR i IN 1..5 LOOP
        new_code := new_code || substr(charset, floor(random() * length(charset) + 1)::int, 1);
      END LOOP;
      
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_code = new_code) INTO code_exists;
      
      EXIT WHEN NOT code_exists OR attempt > 20;
      attempt := attempt + 1;
    END LOOP;
    
    -- Update profile with generated code
    UPDATE public.profiles SET user_code = new_code WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Make user_code NOT NULL after backfill
ALTER TABLE public.profiles 
ALTER COLUMN user_code SET NOT NULL;