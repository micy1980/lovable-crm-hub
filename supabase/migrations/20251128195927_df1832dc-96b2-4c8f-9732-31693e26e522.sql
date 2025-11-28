-- Create function to generate trial license for first company
CREATE OR REPLACE FUNCTION public.create_trial_license_for_first_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_count integer;
  trial_key text;
BEGIN
  -- Count total companies (including the one being inserted)
  SELECT COUNT(*) INTO company_count FROM public.companies WHERE deleted_at IS NULL;
  
  -- If this is the first company, create a 14-day trial license
  IF company_count = 1 THEN
    -- Generate a trial license key
    trial_key := 'TRIAL-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    
    -- Insert trial license
    INSERT INTO public.company_licenses (
      company_id,
      max_users,
      valid_from,
      valid_until,
      features,
      is_active,
      license_key
    ) VALUES (
      NEW.id,
      5,  -- Max 5 users for trial
      now(),
      now() + interval '14 days',
      '["partners", "sales", "calendar", "projects", "documents", "logs"]'::jsonb,
      true,
      trial_key
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create trial license
DROP TRIGGER IF EXISTS trigger_create_trial_license ON public.companies;
CREATE TRIGGER trigger_create_trial_license
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_license_for_first_company();