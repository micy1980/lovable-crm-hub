-- Add versioning columns to contract_versions table
ALTER TABLE public.contract_versions 
ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS original_file_id UUID REFERENCES public.contract_versions(id);

-- Update existing rows to mark latest version as current per contract
WITH ranked_versions AS (
  SELECT id, contract_id, version_number,
         ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY version_number DESC) as rn
  FROM public.contract_versions
)
UPDATE public.contract_versions cv
SET is_current = (rv.rn = 1)
FROM ranked_versions rv
WHERE cv.id = rv.id;

-- Add RLS policy for UPDATE (version restore and versioning)
CREATE POLICY "Admins can update contract versions"
ON public.contract_versions
FOR UPDATE
USING (
  is_2fa_verified(auth.uid()) 
  AND is_admin_or_above(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_versions.contract_id
    AND (
      is_super_admin(auth.uid())
      OR c.owner_company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  is_2fa_verified(auth.uid()) 
  AND is_admin_or_above(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_versions.contract_id
    AND (
      is_super_admin(auth.uid())
      OR c.owner_company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  )
);

-- Add RLS policy for DELETE (file deletion by Admin)
CREATE POLICY "Admins can delete contract versions"
ON public.contract_versions
FOR DELETE
USING (
  is_2fa_verified(auth.uid()) 
  AND is_admin_or_above(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_versions.contract_id
    AND (
      is_super_admin(auth.uid())
      OR c.owner_company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  )
);