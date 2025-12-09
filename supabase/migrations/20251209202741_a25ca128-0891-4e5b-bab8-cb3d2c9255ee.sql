-- FIX 7: Storage documents bucket INSERT policy - add company scope validation
DROP POLICY IF EXISTS "Users can upload document files to their company" ON storage.objects;
CREATE POLICY "Users can upload document files to their company" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid() IS NOT NULL AND
    is_2fa_verified(auth.uid()) AND
    -- Verify user belongs to the company folder they're uploading to
    EXISTS (
      SELECT 1 FROM user_companies uc 
      WHERE uc.user_id = auth.uid() 
        AND (storage.foldername(name))[1] = uc.company_id::text
    )
  );