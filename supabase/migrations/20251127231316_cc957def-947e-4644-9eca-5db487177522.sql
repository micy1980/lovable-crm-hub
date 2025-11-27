-- Drop and recreate with correct per-company admin logic
DROP POLICY IF EXISTS "Admins can update non-SA users in their companies" ON public.profiles;

-- Policy for per-company admins to update user flags
-- Checks if requester is ADMIN in any company shared with target user
CREATE POLICY "Company admins can update users in their companies"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Target must not be SA (SA can only be updated by other SA)
  (role != 'super_admin')
  AND
  -- Target must not be deleted
  (deleted_at IS NULL)
  AND
  -- Requester must be a company admin in at least one shared company
  EXISTS (
    SELECT 1
    FROM user_company_permissions ucp_admin
    JOIN user_company_permissions ucp_target ON ucp_admin.company_id = ucp_target.company_id
    WHERE ucp_admin.user_id = auth.uid()
      AND ucp_admin.role = 'ADMIN'
      AND ucp_target.user_id = profiles.id
  )
)
WITH CHECK (
  -- Same conditions for new row
  (role != 'super_admin')
  AND
  (deleted_at IS NULL)
  AND
  EXISTS (
    SELECT 1
    FROM user_company_permissions ucp_admin
    JOIN user_company_permissions ucp_target ON ucp_admin.company_id = ucp_target.company_id
    WHERE ucp_admin.user_id = auth.uid()
      AND ucp_admin.role = 'ADMIN'
      AND ucp_target.user_id = profiles.id
  )
);