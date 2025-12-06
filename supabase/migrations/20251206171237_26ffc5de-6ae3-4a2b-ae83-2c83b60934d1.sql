-- Add soft delete policy for documents - only admins can mark as deleted
CREATE POLICY "Admins can soft delete documents"
ON public.documents
FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND is_admin_or_above(auth.uid())
  AND deleted_at IS NULL
  AND (
    is_super_admin(auth.uid())
    OR owner_company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  deleted_at IS NOT NULL
);

-- Drop existing SELECT policy and recreate with SA visibility for deleted docs
DROP POLICY IF EXISTS "Users can view documents based on visibility" ON public.documents;

CREATE POLICY "Users can view documents based on visibility"
ON public.documents
FOR SELECT
USING (
  is_2fa_verified(auth.uid())
  AND (
    -- Super admin can see ALL documents including deleted ones
    is_super_admin(auth.uid())
    OR (
      -- Regular users can only see non-deleted documents
      deleted_at IS NULL
      AND (
        (visibility = 'COMPANY_ONLY' AND owner_company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ))
        OR (visibility = 'PROJECT_ONLY' AND project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p
          JOIN user_companies uc ON uc.company_id = p.company_id
          WHERE p.id = documents.project_id AND uc.user_id = auth.uid()
        ))
        OR (visibility = 'SALES_ONLY' AND sales_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM sales s
          JOIN user_companies uc ON uc.company_id = s.company_id
          WHERE s.id = documents.sales_id AND uc.user_id = auth.uid()
        ))
        OR (visibility = 'PUBLIC' AND owner_company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ))
      )
    )
  )
);