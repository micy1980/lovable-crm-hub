-- Add default_company_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN default_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_profiles_default_company ON public.profiles(default_company_id);

COMMENT ON COLUMN public.profiles.default_company_id IS 'The default company for this user. If not set, the first assigned company will be used.';