-- Create can_soft_delete_event helper function
CREATE OR REPLACE FUNCTION public.can_soft_delete_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = _event_id
    AND e.deleted_at IS NULL
    AND (
      -- Super admin can delete any event
      is_super_admin(_user_id)
      OR (
        -- User must be in the same company
        EXISTS (
          SELECT 1 FROM user_companies uc 
          WHERE uc.user_id = _user_id AND uc.company_id = e.company_id
        )
        AND (
          -- Creator can delete their own personal events
          (e.created_by = _user_id AND e.project_id IS NULL AND e.sales_id IS NULL)
          -- Admin can delete any event in their company
          OR is_admin(_user_id)
          -- Project owner/responsibles can delete project events
          OR (e.project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = e.project_id
            AND (p.owner_user_id = _user_id OR p.responsible1_user_id = _user_id OR p.responsible2_user_id = _user_id)
          ))
        )
      )
    )
  );
$$;

-- Create soft_delete_event SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.soft_delete_event(_event_id uuid)
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
  
  _can_delete := can_soft_delete_event(_user_id, _event_id);
  
  IF NOT _can_delete THEN
    RAISE EXCEPTION 'Permission denied: cannot delete this event';
  END IF;
  
  UPDATE public.events
  SET deleted_at = now(), updated_at = now()
  WHERE id = _event_id AND deleted_at IS NULL;
  
  RETURN true;
END;
$$;