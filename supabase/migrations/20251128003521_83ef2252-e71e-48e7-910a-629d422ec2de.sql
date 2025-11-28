-- Add license_key column to company_licenses
ALTER TABLE public.company_licenses 
ADD COLUMN license_key text UNIQUE;

-- Create function to generate license key
CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  key_prefix text := 'LIC';
  random_part text;
  checksum text;
  full_key text;
  key_exists boolean;
BEGIN
  LOOP
    -- Generate random alphanumeric string (20 chars)
    random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    
    -- Create checksum from random part (4 chars)
    checksum := upper(substring(md5(random_part) from 1 for 4));
    
    -- Format: LIC-XXXXX-XXXXX-XXXXX-XXXXX-XXXX
    full_key := key_prefix || '-' || 
                substring(random_part from 1 for 5) || '-' ||
                substring(random_part from 6 for 5) || '-' ||
                substring(random_part from 11 for 5) || '-' ||
                substring(random_part from 16 for 5) || '-' ||
                checksum;
    
    -- Check if key already exists
    SELECT EXISTS(SELECT 1 FROM public.company_licenses WHERE license_key = full_key) INTO key_exists;
    
    -- If key doesn't exist, return it
    IF NOT key_exists THEN
      RETURN full_key;
    END IF;
    
    -- Otherwise loop and generate a new one
  END LOOP;
END;
$$;

-- Create trigger function to auto-generate license key on insert
CREATE OR REPLACE FUNCTION public.auto_generate_license_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only generate if license_key is not provided
  IF NEW.license_key IS NULL THEN
    NEW.license_key := generate_license_key();
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to company_licenses
CREATE TRIGGER trigger_auto_generate_license_key
  BEFORE INSERT ON public.company_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_license_key();

-- Generate license keys for existing records that don't have one
UPDATE public.company_licenses 
SET license_key = generate_license_key()
WHERE license_key IS NULL;