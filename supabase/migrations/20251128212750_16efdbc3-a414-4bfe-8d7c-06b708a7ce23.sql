-- Fix locked_accounts RLS so failed logins can lock accounts

-- Drop overly-restrictive ALL policy
DROP POLICY IF EXISTS "Super admins can manage locked accounts" ON public.locked_accounts;

-- Allow unauthenticated/system inserts for locking accounts
DROP POLICY IF EXISTS "System can insert locked accounts" ON public.locked_accounts;

CREATE POLICY "System can insert locked accounts"
  ON public.locked_accounts
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (true);

-- Super admins can view locked accounts
CREATE POLICY "SA can select locked accounts"
  ON public.locked_accounts
  AS RESTRICTIVE
  FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Super admins can update (unlock) locked accounts
CREATE POLICY "SA can update locked accounts"
  ON public.locked_accounts
  AS RESTRICTIVE
  FOR UPDATE
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can delete locked account rows if ever needed
CREATE POLICY "SA can delete locked accounts"
  ON public.locked_accounts
  AS RESTRICTIVE
  FOR DELETE
  USING (is_super_admin(auth.uid()));