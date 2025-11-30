-- Add 2FA verification check to RLS policies on critical tables
-- This ensures that users with 2FA enabled must verify before accessing data

-- Profiles table: Add 2FA check to existing policies
DROP POLICY IF EXISTS "Profiles readable by self, admins (scoped), and super admins" ON public.profiles;
CREATE POLICY "Profiles readable by self, admins (scoped), and super admins"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND (
    (id = auth.uid()) 
    OR is_super_admin(auth.uid()) 
    OR (
      is_admin(auth.uid()) 
      AND EXISTS (
        SELECT 1
        FROM user_companies uc_admin
        JOIN user_companies uc_user ON uc_admin.company_id = uc_user.company_id
        WHERE uc_admin.user_id = auth.uid()
          AND uc_user.user_id = profiles.id
      )
    )
  )
);

-- Companies table
DROP POLICY IF EXISTS "Companies scoped by user" ON public.companies;
CREATE POLICY "Companies scoped by user"
ON public.companies
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND (
    is_super_admin(auth.uid()) 
    OR id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

-- Projects table
DROP POLICY IF EXISTS "Users can view projects in their companies" ON public.projects;
CREATE POLICY "Users can view projects in their companies"
ON public.projects
FOR SELECT
USING (
  deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create projects in their companies" ON public.projects;
CREATE POLICY "Users can create projects in their companies"
ON public.projects
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update projects in their companies" ON public.projects;
CREATE POLICY "Users can update projects in their companies"
ON public.projects
FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

-- Sales table
DROP POLICY IF EXISTS "Users can view sales in their companies" ON public.sales;
CREATE POLICY "Users can view sales in their companies"
ON public.sales
FOR SELECT
USING (
  deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create sales in their companies" ON public.sales;
CREATE POLICY "Users can create sales in their companies"
ON public.sales
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update sales in their companies" ON public.sales;
CREATE POLICY "Users can update sales in their companies"
ON public.sales
FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

-- Partners table
DROP POLICY IF EXISTS "Authenticated company users can view partners" ON public.partners;
CREATE POLICY "Authenticated company users can view partners"
ON public.partners
FOR SELECT
USING (
  deleted_at IS NULL 
  AND auth.uid() IS NOT NULL 
  AND is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1 
    FROM user_companies uc 
    WHERE uc.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert partners" ON public.partners;
CREATE POLICY "Admins can insert partners"
ON public.partners
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
);

DROP POLICY IF EXISTS "Admins can update partners" ON public.partners;
CREATE POLICY "Admins can update partners"
ON public.partners
FOR UPDATE
USING (
  deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
)
WITH CHECK (
  deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
);

-- Documents table
DROP POLICY IF EXISTS "Documents viewable by company users" ON public.documents;
CREATE POLICY "Documents viewable by company users"
ON public.documents
FOR SELECT
USING (
  deleted_at IS NULL 
  AND auth.uid() IS NOT NULL 
  AND is_2fa_verified(auth.uid())
  AND (
    is_super_admin(auth.uid())
    OR owner_company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create documents in their companies" ON public.documents;
CREATE POLICY "Users can create documents in their companies"
ON public.documents
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR owner_company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update documents in their companies" ON public.documents;
CREATE POLICY "Users can update documents in their companies"
ON public.documents
FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'::user_role
    OR owner_company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
);