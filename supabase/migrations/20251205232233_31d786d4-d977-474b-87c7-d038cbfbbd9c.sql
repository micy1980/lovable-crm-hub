-- Create soft_delete_company SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.soft_delete_company(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT is_2fa_verified(_user_id) THEN
    RAISE EXCEPTION '2FA verification required';
  END IF;
  
  -- Only super_admin or admin can delete companies
  IF NOT is_super_admin(_user_id) AND NOT is_admin(_user_id) THEN
    RAISE EXCEPTION 'Permission denied: only admins can delete companies';
  END IF;
  
  -- Check if user is member of the company (unless super_admin)
  IF NOT is_super_admin(_user_id) AND NOT EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = _user_id AND uc.company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a member of this company';
  END IF;
  
  UPDATE public.companies
  SET deleted_at = now(), updated_at = now()
  WHERE id = _company_id AND deleted_at IS NULL;
  
  RETURN true;
END;
$$;

-- Create soft_delete_document SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.soft_delete_document(_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _doc_company_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT is_2fa_verified(_user_id) THEN
    RAISE EXCEPTION '2FA verification required';
  END IF;
  
  -- Get document's company
  SELECT owner_company_id INTO _doc_company_id
  FROM public.documents
  WHERE id = _document_id AND deleted_at IS NULL;
  
  IF _doc_company_id IS NULL THEN
    RAISE EXCEPTION 'Document not found or already deleted';
  END IF;
  
  -- Check permission: super_admin, or company member with normal/admin role
  IF NOT is_super_admin(_user_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_companies uc WHERE uc.user_id = _user_id AND uc.company_id = _doc_company_id
    ) THEN
      RAISE EXCEPTION 'Permission denied: not a member of document company';
    END IF;
    
    IF (SELECT role FROM profiles WHERE id = _user_id) NOT IN ('normal', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'Permission denied: insufficient role';
    END IF;
  END IF;
  
  UPDATE public.documents
  SET deleted_at = now(), updated_at = now()
  WHERE id = _document_id AND deleted_at IS NULL;
  
  RETURN true;
END;
$$;