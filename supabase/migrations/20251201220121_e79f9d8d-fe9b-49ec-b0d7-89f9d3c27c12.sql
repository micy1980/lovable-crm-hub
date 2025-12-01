-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
-- Policy: Users can view documents in their company
CREATE POLICY "Users can view documents in their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN user_companies uc ON uc.company_id = d.owner_company_id
    WHERE d.file_path = storage.objects.name
    AND uc.user_id = auth.uid()
  )
);

-- Policy: Users can upload documents to their company folder
CREATE POLICY "Users can upload documents to their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT uc.company_id::text
    FROM user_companies uc
    WHERE uc.user_id = auth.uid()
  )
);

-- Policy: Users can update their company documents
CREATE POLICY "Users can update their company documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN user_companies uc ON uc.company_id = d.owner_company_id
    WHERE d.file_path = storage.objects.name
    AND uc.user_id = auth.uid()
  )
);

-- Policy: Users can delete their company documents
CREATE POLICY "Users can delete their company documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN user_companies uc ON uc.company_id = d.owner_company_id
    WHERE d.file_path = storage.objects.name
    AND uc.user_id = auth.uid()
  )
);