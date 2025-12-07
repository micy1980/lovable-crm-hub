-- Add version tracking to document_files
ALTER TABLE public.document_files
ADD COLUMN version integer NOT NULL DEFAULT 1,
ADD COLUMN original_file_id uuid REFERENCES public.document_files(id),
ADD COLUMN is_current boolean NOT NULL DEFAULT true;

-- Create index for version queries
CREATE INDEX idx_document_files_original ON public.document_files(original_file_id);
CREATE INDEX idx_document_files_current ON public.document_files(document_id, is_current) WHERE is_current = true;

-- Update policy to allow version updates
CREATE POLICY "Admins can update document files for versioning"
ON public.document_files
FOR UPDATE
USING (
  is_2fa_verified(auth.uid()) 
  AND is_admin_or_above(auth.uid())
  AND EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_files.document_id
    AND (is_super_admin(auth.uid()) OR d.owner_company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
  )
)
WITH CHECK (
  is_2fa_verified(auth.uid()) 
  AND is_admin_or_above(auth.uid())
  AND EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_files.document_id
    AND (is_super_admin(auth.uid()) OR d.owner_company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
  )
);