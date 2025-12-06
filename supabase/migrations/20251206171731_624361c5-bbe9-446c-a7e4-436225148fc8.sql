-- Create RPC for hard delete document (SA only, deletes file from storage too via frontend)
CREATE OR REPLACE FUNCTION public.hard_delete_document(_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _file_path text;
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can permanently delete documents';
  END IF;
  
  -- Get file path before delete
  SELECT file_path INTO _file_path FROM documents WHERE id = _document_id;
  
  -- Hard delete the document
  DELETE FROM documents WHERE id = _document_id;
  
  RETURN true;
END;
$$;

-- Create RPC for soft delete contract
CREATE OR REPLACE FUNCTION public.soft_delete_contract(_contract_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user is admin or above
  IF NOT is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete contracts';
  END IF;
  
  -- Check 2FA verification
  IF NOT is_2fa_verified(auth.uid()) THEN
    RAISE EXCEPTION '2FA verification required';
  END IF;
  
  -- Check company access
  IF NOT is_super_admin(auth.uid()) THEN
    IF NOT EXISTS (
      SELECT 1 FROM contracts c
      JOIN user_companies uc ON uc.company_id = c.owner_company_id
      WHERE c.id = _contract_id AND uc.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  -- Soft delete
  UPDATE contracts
  SET deleted_at = now(), updated_at = now()
  WHERE id = _contract_id AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Create RPC for hard delete contract (SA only)
CREATE OR REPLACE FUNCTION public.hard_delete_contract(_contract_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can permanently delete contracts';
  END IF;
  
  -- Delete contract versions first (to avoid FK constraint)
  DELETE FROM contract_versions WHERE contract_id = _contract_id;
  
  -- Delete contract user access
  DELETE FROM contract_user_access WHERE contract_id = _contract_id;
  
  -- Hard delete the contract
  DELETE FROM contracts WHERE id = _contract_id;
  
  RETURN true;
END;
$$;

-- Update contracts SELECT policy to show deleted items to SA
DROP POLICY IF EXISTS "Users can view contracts with access check" ON contracts;
CREATE POLICY "Users can view contracts with access check" ON contracts
FOR SELECT USING (
  is_2fa_verified(auth.uid()) AND (
    -- Super admins can see ALL contracts including deleted
    is_super_admin(auth.uid()) OR
    -- Others can only see non-deleted contracts in their company with access check
    (
      deleted_at IS NULL AND
      owner_company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      ) AND (
        restrict_access = false OR
        restrict_access IS NULL OR
        EXISTS (
          SELECT 1 FROM contract_user_access cua
          WHERE cua.contract_id = contracts.id AND cua.user_id = auth.uid()
        ) OR
        is_admin_or_above(auth.uid())
      )
    )
  )
);