-- Migrate existing document files from documents table to document_files table
INSERT INTO public.document_files (document_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
SELECT 
  id as document_id,
  COALESCE(
    REVERSE(SPLIT_PART(REVERSE(file_path), '/', 1)),
    'document'
  ) as file_name,
  file_path,
  file_size,
  mime_type,
  uploaded_by,
  COALESCE(uploaded_at, created_at, now())
FROM public.documents
WHERE file_path IS NOT NULL 
  AND file_path != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.document_files df 
    WHERE df.document_id = documents.id AND df.file_path = documents.file_path
  );