-- Drop the problematic policy and recreate with clearer logic
DROP POLICY IF EXISTS "Admins can update user flags in their companies" ON public.profiles;

-- Create separate clearer policies for admins updating user flags
-- This policy allows admins (not SA) to update non-SA users in their companies
CREATE POLICY "Admins can update non-SA users in their companies"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Requester must be admin (not SA, since SA has their own policy)
  is_admin(auth.uid())
  AND
  -- Target user cannot be SA
  (role != 'super_admin')
  AND
  -- Target user must be deleted_at null
  (deleted_at IS NULL)
  AND
  -- Must share at least one company
  EXISTS (
    SELECT 1
    FROM user_companies uc_admin
    JOIN user_companies uc_target ON uc_admin.company_id = uc_target.company_id
    WHERE uc_admin.user_id = auth.uid()
      AND uc_target.user_id = profiles.id
  )
)
WITH CHECK (
  -- Same conditions for the new row
  is_admin(auth.uid())
  AND
  (role != 'super_admin')
  AND
  (deleted_at IS NULL)
  AND
  EXISTS (
    SELECT 1
    FROM user_companies uc_admin
    JOIN user_companies uc_target ON uc_admin.company_id = uc_target.company_id
    WHERE uc_admin.user_id = auth.uid()
      AND uc_target.user_id = profiles.id
  )
);