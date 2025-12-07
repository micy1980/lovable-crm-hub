-- Fix file names that were migrated with storage path instead of original name
-- Extract proper filename from file_path (last segment after last /)
UPDATE public.document_files
SET file_name = 
  CASE 
    WHEN file_name LIKE '%/%' THEN substring(file_name from '[^/]+$')
    ELSE file_name
  END
WHERE file_name LIKE '%/%';