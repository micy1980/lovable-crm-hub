-- Drop existing storage policies for documents bucket
DROP POLICY IF EXISTS "Users can view documents in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company documents" ON storage.objects;

-- Create new storage policies that check document_files table
CREATE POLICY "Users can view document files in their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM document_files df
    JOIN documents d ON d.id = df.document_id
    JOIN user_companies uc ON uc.company_id = d.owner_company_id
    WHERE df.file_path = objects.name 
    AND uc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload document files to their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update document files in their company"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM document_files df
    JOIN documents d ON d.id = df.document_id
    JOIN user_companies uc ON uc.company_id = d.owner_company_id
    WHERE df.file_path = objects.name 
    AND uc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete document files in their company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM document_files df
    JOIN documents d ON d.id = df.document_id
    JOIN user_companies uc ON uc.company_id = d.owner_company_id
    WHERE df.file_path = objects.name 
    AND uc.user_id = auth.uid()
  )
);