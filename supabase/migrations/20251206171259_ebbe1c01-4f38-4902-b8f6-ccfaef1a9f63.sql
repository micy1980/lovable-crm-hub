-- Create soft_delete_document RPC function
CREATE OR REPLACE FUNCTION public.soft_delete_document(_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _document_company_id uuid;
BEGIN
  _user_id := auth.uid();
  
  -- Check if user is authenticated
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check 2FA verification
  IF NOT is_2fa_verified(_user_id) THEN
    RAISE EXCEPTION '2FA verification required';
  END IF;
  
  -- Check if user is admin or above
  IF NOT is_admin_or_above(_user_id) THEN
    RAISE EXCEPTION 'Permission denied: only admins can delete documents';
  END IF;
  
  -- Get document company_id
  SELECT owner_company_id INTO _document_company_id
  FROM public.documents
  WHERE id = _document_id AND deleted_at IS NULL;
  
  IF _document_company_id IS NULL THEN
    RAISE EXCEPTION 'Document not found or already deleted';
  END IF;
  
  -- Check company membership (unless super admin)
  IF NOT is_super_admin(_user_id) AND NOT EXISTS (
    SELECT 1 FROM user_companies uc 
    WHERE uc.user_id = _user_id AND uc.company_id = _document_company_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a member of this company';
  END IF;
  
  -- Perform the soft delete
  UPDATE public.documents
  SET deleted_at = now(), updated_at = now()
  WHERE id = _document_id AND deleted_at IS NULL;
  
  RETURN true;
END;
$$;