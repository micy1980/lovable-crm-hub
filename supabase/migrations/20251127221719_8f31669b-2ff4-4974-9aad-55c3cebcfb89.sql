-- Refactor permission model: per-company roles + Viewer read-only invariants

-- 1) Add unique constraint on (user_id, company_id) if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_company_permissions_user_id_company_id_key'
  ) THEN
    ALTER TABLE public.user_company_permissions 
    ADD CONSTRAINT user_company_permissions_user_id_company_id_key 
    UNIQUE (user_id, company_id);
  END IF;
END $$;

-- 2) Add CHECK constraint: Viewer cannot have write permissions
ALTER TABLE public.user_company_permissions 
DROP CONSTRAINT IF EXISTS viewer_read_only_check;

ALTER TABLE public.user_company_permissions
ADD CONSTRAINT viewer_read_only_check CHECK (
  role != 'VIEWER' OR (
    can_delete = false AND 
    can_edit_master_data = false
  )
);

-- 3) Create helper functions for per-company permission checks
-- These can safely query user_company_permissions because they're used on OTHER tables

CREATE OR REPLACE FUNCTION public.get_company_role(_user_id uuid, _company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role::text
  FROM public.user_company_permissions
  WHERE user_id = _user_id 
    AND company_id = _company_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.can_user_delete_in_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN is_super_admin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_company_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND role IN ('ADMIN', 'NORMAL')
        AND can_delete = true
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.can_user_edit_master_data_in_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN is_super_admin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_company_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND role IN ('ADMIN', 'NORMAL')
        AND can_edit_master_data = true
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.can_user_view_logs_in_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN is_super_admin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_company_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND can_view_logs = true
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_company_admin_new(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_permissions
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = 'ADMIN'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_company_ids_new(_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT company_id
  FROM public.user_company_permissions
  WHERE user_id = _user_id
    AND role = 'ADMIN';
$function$;

-- 4) Update RLS policies on user_company_permissions to avoid recursion
-- Keep using the OLD helper functions (is_company_admin, get_admin_company_ids)
-- which read from user_companies + profiles, NOT user_company_permissions

DROP POLICY IF EXISTS "SA can manage all company permissions" ON public.user_company_permissions;
DROP POLICY IF EXISTS "SA can view all company permissions" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can manage lower-level users in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can update lower-level users in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can view permissions in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions in their companies" ON public.user_company_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_company_permissions;

-- SA policies (global access)
CREATE POLICY "SA can manage all company permissions"
ON public.user_company_permissions
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Admin policies (per-company, non-recursive)
-- Admins can view permissions in companies where they are admin (via user_companies)
CREATE POLICY "Admins can view permissions in their companies"
ON public.user_company_permissions
FOR SELECT
TO authenticated
USING (
  is_admin_or_above(auth.uid()) 
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
);

-- Admins can insert permissions for non-SA users in their companies
CREATE POLICY "Admins can insert permissions in their companies"
ON public.user_company_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
  AND user_id IN (
    SELECT id FROM public.profiles 
    WHERE role != 'super_admin'
  )
);

-- Admins can update permissions in their companies
CREATE POLICY "Admins can update permissions in their companies"
ON public.user_company_permissions
FOR UPDATE
TO authenticated
USING (
  is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
)
WITH CHECK (
  is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
);

-- Admins can delete permissions in their companies
CREATE POLICY "Admins can delete permissions in their companies"
ON public.user_company_permissions
FOR DELETE
TO authenticated
USING (
  is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_company_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());