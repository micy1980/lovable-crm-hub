-- Function to get users in a company for assignment dropdowns
-- This allows users to see other company members for task/project assignment
CREATE OR REPLACE FUNCTION get_company_users_for_assignment(_company_id uuid)
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if user is member of the company
  IF NOT EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = _company_id AND uc.user_id = auth.uid()
  ) AND NOT is_super_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.id, p.full_name, p.email
  FROM profiles p
  JOIN user_companies uc ON uc.user_id = p.id
  WHERE uc.company_id = _company_id
    AND p.deleted_at IS NULL
    AND p.is_active = true
  ORDER BY p.full_name, p.email;
END;
$$;