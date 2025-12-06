-- Create document_files table for multiple files per document
CREATE TABLE public.document_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

-- Users can view files for documents they can access
CREATE POLICY "Users can view document files"
ON public.document_files
FOR SELECT
USING (
  is_2fa_verified(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_files.document_id
    AND (
      is_super_admin(auth.uid()) OR
      (d.deleted_at IS NULL AND (
        (d.visibility = 'COMPANY_ONLY' AND d.owner_company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )) OR
        (d.visibility = 'PROJECT_ONLY' AND d.project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p
          JOIN user_companies uc ON uc.company_id = p.company_id
          WHERE p.id = d.project_id AND uc.user_id = auth.uid()
        )) OR
        (d.visibility = 'SALES_ONLY' AND d.sales_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM sales s
          JOIN user_companies uc ON uc.company_id = s.company_id
          WHERE s.id = d.sales_id AND uc.user_id = auth.uid()
        )) OR
        (d.visibility = 'PUBLIC' AND d.owner_company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        ))
      ))
    )
  )
);

-- Users can upload files to documents in their companies
CREATE POLICY "Users can upload document files"
ON public.document_files
FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid()) AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['normal'::user_role, 'admin'::user_role, 'super_admin'::user_role]) AND
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_files.document_id
    AND d.deleted_at IS NULL
    AND (
      is_super_admin(auth.uid()) OR
      d.owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
);

-- Admins can delete document files
CREATE POLICY "Admins can delete document files"
ON public.document_files
FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND
  is_admin_or_above(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_files.document_id
    AND (
      is_super_admin(auth.uid()) OR
      d.owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
);

-- Create index for faster lookups
CREATE INDEX idx_document_files_document_id ON public.document_files(document_id);