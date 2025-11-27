-- Fix RLS policies for profiles table to allow toggling is_active flag

-- First, let's check existing policies (this is for reference, actual fix below)
-- Current policies should allow:
-- 1. SA can update any profile (already exists)
-- 2. Users can update their own profile (already exists)
-- 3. We need to add: Admins can update profiles of users in their companies (for is_active toggle)

-- Add policy for admins to update user flags (is_active, can_delete, can_view_logs)
-- Admins can update these fields for non-SA users in their companies
CREATE POLICY "Admins can update user flags in their companies"
ON public.profiles
FOR UPDATE
USING (
  -- Admin or above can update
  is_admin_or_above(auth.uid())
  AND
  -- Cannot be SA user (only SA can update SA)
  (role != 'super_admin')
  AND
  -- Must be in a shared company (admin has access to this user)
  (
    is_super_admin(auth.uid()) 
    OR 
    EXISTS (
      SELECT 1
      FROM user_companies uc_admin
      JOIN user_companies uc_target ON uc_admin.company_id = uc_target.company_id
      WHERE uc_admin.user_id = auth.uid()
        AND uc_target.user_id = profiles.id
    )
  )
)
WITH CHECK (
  -- Same conditions for the resulting row
  is_admin_or_above(auth.uid())
  AND
  (role != 'super_admin')
  AND
  (
    is_super_admin(auth.uid()) 
    OR 
    EXISTS (
      SELECT 1
      FROM user_companies uc_admin
      JOIN user_companies uc_target ON uc_admin.company_id = uc_target.company_id
      WHERE uc_admin.user_id = auth.uid()
        AND uc_target.user_id = profiles.id
    )
  )
);