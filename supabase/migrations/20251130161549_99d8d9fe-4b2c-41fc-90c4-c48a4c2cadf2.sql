-- Step 5C: Extend 2FA enforcement to all critical tables
-- Add is_2fa_verified checks to tables that don't have them yet

-- Tasks table
DROP POLICY IF EXISTS "Users can view tasks in their companies" ON public.tasks;
CREATE POLICY "Users can view tasks in their companies"
ON public.tasks
FOR SELECT
USING (
  (deleted_at IS NULL)
  AND is_2fa_verified(auth.uid())
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create tasks in their companies" ON public.tasks;
CREATE POLICY "Users can create tasks in their companies"
ON public.tasks
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin')
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update tasks in their companies" ON public.tasks;
CREATE POLICY "Users can update tasks in their companies"
ON public.tasks
FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin')
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  )
);

-- Costs table
DROP POLICY IF EXISTS "Users can view non-deleted costs in their companies" ON public.costs;
CREATE POLICY "Users can view non-deleted costs in their companies"
ON public.costs
FOR SELECT
USING (
  (deleted_at IS NULL)
  AND (auth.uid() IS NOT NULL)
  AND is_2fa_verified(auth.uid())
  AND (
    is_super_admin(auth.uid())
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      JOIN public.user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins can create costs in their companies" ON public.costs;
CREATE POLICY "Admins can create costs in their companies"
ON public.costs
FOR INSERT
WITH CHECK (
  (deleted_at IS NULL)
  AND is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND (
    is_super_admin(auth.uid())
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      JOIN public.user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins can update non-deleted costs in their companies" ON public.costs;
CREATE POLICY "Admins can update non-deleted costs in their companies"
ON public.costs
FOR UPDATE
USING (
  (deleted_at IS NULL)
  AND is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND (
    is_super_admin(auth.uid())
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      JOIN public.user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
    )
  )
)
WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users with can_delete can soft delete costs" ON public.costs;
CREATE POLICY "Users with can_delete can soft delete costs"
ON public.costs
FOR UPDATE
USING (
  (deleted_at IS NULL)
  AND is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.can_delete = true
      AND p.is_active = true
      AND p.deleted_at IS NULL
  )
)
WITH CHECK (deleted_at IS NOT NULL);

-- Master data table (read is OK without 2FA, but write requires 2FA)
DROP POLICY IF EXISTS "Master data readable by authenticated users" ON public.master_data;
CREATE POLICY "Master data readable by authenticated users"
ON public.master_data
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Master data modifiable by super admin only" ON public.master_data;
CREATE POLICY "Master data modifiable by super admin only"
ON public.master_data
FOR ALL
USING (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()))
WITH CHECK (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()));

-- Exchange rates table (read is OK without 2FA, but write requires 2FA)
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON public.exchange_rates;
CREATE POLICY "Authenticated users can view exchange rates"
ON public.exchange_rates
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can manage exchange rates" ON public.exchange_rates;
CREATE POLICY "Super admins can manage exchange rates"
ON public.exchange_rates
FOR ALL
USING (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()))
WITH CHECK (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()));

-- User companies table
DROP POLICY IF EXISTS "Users can view their own mappings or super_admin can view all" ON public.user_companies;
CREATE POLICY "Users can view their own mappings or super_admin can view all"
ON public.user_companies
FOR SELECT
USING (
  is_2fa_verified(auth.uid())
  AND (auth.uid() = user_id OR is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Super admin can insert any mapping" ON public.user_companies;
CREATE POLICY "Super admin can insert any mapping"
ON public.user_companies
FOR INSERT
WITH CHECK (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can update any mapping" ON public.user_companies;
CREATE POLICY "Super admin can update any mapping"
ON public.user_companies
FOR UPDATE
USING (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete any mapping" ON public.user_companies;
CREATE POLICY "Super admin can delete any mapping"
ON public.user_companies
FOR DELETE
USING (is_2fa_verified(auth.uid()) AND is_super_admin(auth.uid()));

-- User company permissions table
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_company_permissions;
CREATE POLICY "Users can view their own permissions"
ON public.user_company_permissions
FOR SELECT
USING (is_2fa_verified(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view permissions in their companies" ON public.user_company_permissions;
CREATE POLICY "Admins can view permissions in their companies"
ON public.user_company_permissions
FOR SELECT
USING (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can insert permissions in their companies" ON public.user_company_permissions;
CREATE POLICY "Admins can insert permissions in their companies"
ON public.user_company_permissions
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
  AND user_id IN (
    SELECT id FROM public.profiles WHERE role <> 'super_admin'
  )
);

DROP POLICY IF EXISTS "Admins can update permissions in their companies" ON public.user_company_permissions;
CREATE POLICY "Admins can update permissions in their companies"
ON public.user_company_permissions
FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
)
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can delete permissions in their companies" ON public.user_company_permissions;
CREATE POLICY "Admins can delete permissions in their companies"
ON public.user_company_permissions
FOR DELETE
USING (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND company_id IN (SELECT get_admin_company_ids(auth.uid()))
);