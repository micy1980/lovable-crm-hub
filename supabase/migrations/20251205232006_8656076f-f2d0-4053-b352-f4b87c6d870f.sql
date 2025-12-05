-- Create can_soft_delete_task helper function
CREATE OR REPLACE FUNCTION public.can_soft_delete_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = _task_id
    AND t.deleted_at IS NULL
    AND (
      -- Super admin can delete any task
      is_super_admin(_user_id)
      OR (
        -- User must be in the same company
        EXISTS (
          SELECT 1 FROM user_companies uc 
          WHERE uc.user_id = _user_id AND uc.company_id = t.company_id
        )
        AND (
          -- Creator can delete their own personal tasks
          (t.created_by = _user_id AND t.project_id IS NULL AND t.sales_id IS NULL)
          -- Admin can delete any task in their company
          OR is_admin(_user_id)
          -- Project owner/responsibles can delete project tasks
          OR (t.project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = t.project_id
            AND (p.owner_user_id = _user_id OR p.responsible1_user_id = _user_id OR p.responsible2_user_id = _user_id)
          ))
        )
      )
    )
  );
$$;

-- Create soft_delete_task SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.soft_delete_task(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _can_delete boolean;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT is_2fa_verified(_user_id) THEN
    RAISE EXCEPTION '2FA verification required';
  END IF;
  
  _can_delete := can_soft_delete_task(_user_id, _task_id);
  
  IF NOT _can_delete THEN
    RAISE EXCEPTION 'Permission denied: cannot delete this task';
  END IF;
  
  UPDATE public.tasks
  SET deleted_at = now(), updated_at = now()
  WHERE id = _task_id AND deleted_at IS NULL;
  
  RETURN true;
END;
$$;