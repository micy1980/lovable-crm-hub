-- Update can_soft_delete_project to include company membership check
CREATE OR REPLACE FUNCTION public.can_soft_delete_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = _project_id
    AND p.deleted_at IS NULL
    AND (
      -- Super admin can delete any project
      is_super_admin(_user_id) 
      OR (
        -- All other users must be in the same company as the project
        EXISTS (
          SELECT 1 FROM user_companies uc 
          WHERE uc.user_id = _user_id AND uc.company_id = p.company_id
        )
        AND (
          -- Admin with can_delete flag
          (is_admin_or_above(_user_id) AND (SELECT can_delete FROM profiles WHERE id = _user_id) = true)
          -- Any user with can_delete flag
          OR (SELECT can_delete FROM profiles WHERE id = _user_id) = true
          -- Project owner
          OR p.owner_user_id = _user_id
          -- Project responsibles
          OR p.responsible1_user_id = _user_id
          OR p.responsible2_user_id = _user_id
        )
      )
    )
  );
$$;