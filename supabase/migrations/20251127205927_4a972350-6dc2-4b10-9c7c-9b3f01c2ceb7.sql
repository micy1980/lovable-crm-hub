-- Create enum for company-level roles (SA remains in profiles table)
CREATE TYPE public.company_role AS ENUM ('ADMIN', 'NORMAL', 'VIEWER');

-- Create user_company_permissions table
CREATE TABLE public.user_company_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.company_role NOT NULL DEFAULT 'NORMAL',
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_view_logs BOOLEAN NOT NULL DEFAULT false,
  can_edit_master_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.user_company_permissions ENABLE ROW LEVEL SECURITY;

-- Migrate existing user_companies data to user_company_permissions
-- Determine role based on profiles.role
INSERT INTO public.user_company_permissions (user_id, company_id, role, can_delete, can_view_logs, can_edit_master_data)
SELECT 
  uc.user_id,
  uc.company_id,
  CASE 
    WHEN p.role = 'admin' THEN 'ADMIN'::company_role
    WHEN p.role = 'viewer' THEN 'VIEWER'::company_role
    ELSE 'NORMAL'::company_role
  END as role,
  COALESCE(p.can_delete, false) as can_delete,
  COALESCE(p.can_view_logs, false) as can_view_logs,
  CASE 
    WHEN p.role IN ('admin', 'normal') THEN true
    ELSE false
  END as can_edit_master_data
FROM public.user_companies uc
INNER JOIN public.profiles p ON p.id = uc.user_id
WHERE p.role != 'super_admin' -- SA users don't need company permissions
ON CONFLICT (user_id, company_id) DO NOTHING;

-- RLS Policies for user_company_permissions

-- SA can view all permissions
CREATE POLICY "SA can view all company permissions"
ON public.user_company_permissions
FOR SELECT
USING (is_super_admin(auth.uid()));

-- SA can manage all permissions
CREATE POLICY "SA can manage all company permissions"
ON public.user_company_permissions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Admins can view permissions for their companies
CREATE POLICY "Admins can view permissions in their companies"
ON public.user_company_permissions
FOR SELECT
USING (
  is_admin_or_above(auth.uid()) AND
  company_id IN (
    SELECT ucp.company_id 
    FROM user_company_permissions ucp 
    WHERE ucp.user_id = auth.uid() AND ucp.role = 'ADMIN'
  )
);

-- Admins can insert/update permissions only for lower-level users in their companies
CREATE POLICY "Admins can manage lower-level users in their companies"
ON public.user_company_permissions
FOR INSERT
WITH CHECK (
  is_admin_or_above(auth.uid()) AND
  company_id IN (
    SELECT ucp.company_id 
    FROM user_company_permissions ucp 
    WHERE ucp.user_id = auth.uid() AND ucp.role = 'ADMIN'
  ) AND
  -- Cannot create permissions for SA users
  user_id IN (SELECT id FROM profiles WHERE role != 'super_admin')
);

CREATE POLICY "Admins can update lower-level users in their companies"
ON public.user_company_permissions
FOR UPDATE
USING (
  is_admin_or_above(auth.uid()) AND
  company_id IN (
    SELECT ucp.company_id 
    FROM user_company_permissions ucp 
    WHERE ucp.user_id = auth.uid() AND ucp.role = 'ADMIN'
  )
)
WITH CHECK (
  is_admin_or_above(auth.uid()) AND
  company_id IN (
    SELECT ucp.company_id 
    FROM user_company_permissions ucp 
    WHERE ucp.user_id = auth.uid() AND ucp.role = 'ADMIN'
  )
);

-- Admins can delete permissions in their companies
CREATE POLICY "Admins can delete permissions in their companies"
ON public.user_company_permissions
FOR DELETE
USING (
  is_admin_or_above(auth.uid()) AND
  company_id IN (
    SELECT ucp.company_id 
    FROM user_company_permissions ucp 
    WHERE ucp.user_id = auth.uid() AND ucp.role = 'ADMIN'
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_company_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_user_company_permissions_updated_at
  BEFORE UPDATE ON public.user_company_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint to enforce Viewer rules
ALTER TABLE public.user_company_permissions
ADD CONSTRAINT viewer_cannot_delete CHECK (
  role != 'VIEWER' OR can_delete = false
);

ALTER TABLE public.user_company_permissions
ADD CONSTRAINT viewer_cannot_edit_master_data CHECK (
  role != 'VIEWER' OR can_edit_master_data = false
);

-- Keep user_companies table for backward compatibility and SA auto-assignment
-- but it's now just for tracking company membership