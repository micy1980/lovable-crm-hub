-- Create a SECURITY DEFINER function for safe project soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_project(_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _project_company_id uuid;
  _can_delete boolean;
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
  
  -- Get project company_id
  SELECT company_id INTO _project_company_id
  FROM public.projects
  WHERE id = _project_id AND deleted_at IS NULL;
  
  IF _project_company_id IS NULL THEN
    RAISE EXCEPTION 'Project not found or already deleted';
  END IF;
  
  -- Check permission using existing function
  _can_delete := can_soft_delete_project(_user_id, _project_id);
  
  IF NOT _can_delete THEN
    RAISE EXCEPTION 'Permission denied: cannot delete this project';
  END IF;
  
  -- Perform the soft delete
  UPDATE public.projects
  SET deleted_at = now(), updated_at = now()
  WHERE id = _project_id AND deleted_at IS NULL;
  
  RETURN true;
END;
$$;