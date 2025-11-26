-- Create helper function to check if user is admin or above
CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = _user_id;
$$;

-- Fix partners table policies
DROP POLICY IF EXISTS "Anyone can view non-deleted partners" ON public.partners;
DROP POLICY IF EXISTS "Admins can manage partners" ON public.partners;
DROP POLICY IF EXISTS "Admins can update partners" ON public.partners;
DROP POLICY IF EXISTS "Users with can_delete can soft delete partners" ON public.partners;

-- SELECT: Only authenticated users who belong to at least one company
CREATE POLICY "Authenticated company users can view partners"
ON public.partners
FOR SELECT
USING (
  deleted_at IS NULL
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
  )
);

-- INSERT: Only super_admin or admin
CREATE POLICY "Admins can insert partners"
ON public.partners
FOR INSERT
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- UPDATE: Only super_admin or admin for non-deleted partners
CREATE POLICY "Admins can update partners"
ON public.partners
FOR UPDATE
USING (
  deleted_at IS NULL 
  AND public.is_admin_or_above(auth.uid())
)
WITH CHECK (
  deleted_at IS NULL 
  AND public.is_admin_or_above(auth.uid())
);

-- SOFT DELETE: Only super_admin/admin with can_delete flag
CREATE POLICY "Admins with can_delete can soft delete partners"
ON public.partners
FOR UPDATE
USING (
  public.is_admin_or_above(auth.uid())
  AND (SELECT can_delete FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (deleted_at IS NOT NULL);

-- Fix master_data table policies
DROP POLICY IF EXISTS "Anyone can view master data" ON public.master_data;
DROP POLICY IF EXISTS "Admins can manage master data" ON public.master_data;

CREATE POLICY "Authenticated users can view master data"
ON public.master_data
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage master data"
ON public.master_data
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Fix exchange_rates table policies
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins can manage exchange rates" ON public.exchange_rates;

CREATE POLICY "Authenticated users can view exchange rates"
ON public.exchange_rates
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage exchange rates"
ON public.exchange_rates
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));