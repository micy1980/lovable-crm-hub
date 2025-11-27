-- Fix helper functions to avoid infinite recursion on user_company_permissions
-- and align admin checks with non-recursive tables.

-- 1) Replace is_company_admin to use profiles + user_companies only
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies uc
    JOIN public.profiles p ON p.id = uc.user_id
    WHERE uc.user_id = _user_id
      AND uc.company_id = _company_id
      AND p.role = 'admin'
  );
$function$;

-- 2) Replace get_admin_company_ids to use profiles + user_companies only
CREATE OR REPLACE FUNCTION public.get_admin_company_ids(_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT uc.company_id
  FROM public.user_companies uc
  JOIN public.profiles p ON p.id = uc.user_id
  WHERE uc.user_id = _user_id
    AND p.role = 'admin';
$function$;