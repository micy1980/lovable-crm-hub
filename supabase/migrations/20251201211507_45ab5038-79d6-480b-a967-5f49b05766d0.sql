-- ==========================================
-- ALACSONY PRIORITÁSÚ SECURITY: DOCUMENTS VISIBILITY
-- ==========================================
-- Enforce document visibility field in RLS policies
-- Visibility options: 'COMPANY_ONLY', 'PROJECT_ONLY', 'SALES_ONLY', 'PUBLIC'

-- Drop existing document policies
DROP POLICY IF EXISTS "Documents viewable by company users" ON public.documents;
DROP POLICY IF EXISTS "Users can create documents in their companies" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their companies" ON public.documents;

-- Create new visibility-aware RLS policies
CREATE POLICY "Users can view documents based on visibility"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND (
      -- Super admin can see everything
      is_super_admin(auth.uid())
      -- COMPANY_ONLY: visible to all users in the owner company
      OR (
        visibility = 'COMPANY_ONLY'
        AND owner_company_id IN (
          SELECT company_id
          FROM public.user_companies
          WHERE user_id = auth.uid()
        )
      )
      -- PROJECT_ONLY: visible only to users assigned to the specific project
      OR (
        visibility = 'PROJECT_ONLY'
        AND project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.projects p
          JOIN public.user_companies uc ON uc.company_id = p.company_id
          WHERE p.id = documents.project_id
            AND uc.user_id = auth.uid()
        )
      )
      -- SALES_ONLY: visible only to users in the same company as the sales record
      OR (
        visibility = 'SALES_ONLY'
        AND sales_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.sales s
          JOIN public.user_companies uc ON uc.company_id = s.company_id
          WHERE s.id = documents.sales_id
            AND uc.user_id = auth.uid()
        )
      )
      -- PUBLIC: visible to all authenticated users (within companies they belong to)
      OR (
        visibility = 'PUBLIC'
        AND owner_company_id IN (
          SELECT company_id
          FROM public.user_companies
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create documents in their companies"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_2fa_verified(auth.uid())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) 
      IN ('normal', 'admin', 'super_admin')
    )
    AND (
      is_super_admin(auth.uid())
      OR owner_company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
    -- Validate visibility field
    AND visibility IN ('COMPANY_ONLY', 'PROJECT_ONLY', 'SALES_ONLY', 'PUBLIC')
  );

CREATE POLICY "Users can update documents in their companies"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    is_2fa_verified(auth.uid())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) 
      IN ('normal', 'admin', 'super_admin')
    )
    AND (
      is_super_admin(auth.uid())
      OR owner_company_id IN (
        SELECT company_id
        FROM public.user_companies
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Validate visibility field on update
    visibility IN ('COMPANY_ONLY', 'PROJECT_ONLY', 'SALES_ONLY', 'PUBLIC')
  );

COMMENT ON COLUMN public.documents.visibility IS 'Document visibility scope: COMPANY_ONLY (all company users), PROJECT_ONLY (project members only), SALES_ONLY (sales-related users), PUBLIC (all authenticated company users). Enforced by RLS policies.';