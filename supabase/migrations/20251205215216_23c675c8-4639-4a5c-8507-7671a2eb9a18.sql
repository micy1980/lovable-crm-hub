-- Allow deletion of personal tasks (not linked to project or sales) by creator
CREATE POLICY "Users can delete their own personal tasks"
ON public.tasks
FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  project_id IS NULL AND
  sales_id IS NULL AND
  created_by = auth.uid()
);

-- Allow deletion of project/sales tasks by admins, super_admins, or project responsibles
CREATE POLICY "Admins and project responsibles can delete project tasks"
ON public.tasks
FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  (project_id IS NOT NULL OR sales_id IS NOT NULL) AND
  (
    is_super_admin(auth.uid()) OR
    (is_admin(auth.uid()) AND company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (p.owner_user_id = auth.uid() OR p.responsible1_user_id = auth.uid() OR p.responsible2_user_id = auth.uid())
    ))
  )
);

-- Allow deletion of personal events (not linked to project or sales) by creator
CREATE POLICY "Users can delete their own personal events"
ON public.events
FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  project_id IS NULL AND
  sales_id IS NULL AND
  created_by = auth.uid()
);

-- Allow deletion of project/sales events by admins, super_admins, or project responsibles
CREATE POLICY "Admins and project responsibles can delete project events"
ON public.events
FOR DELETE
USING (
  is_2fa_verified(auth.uid()) AND
  deleted_at IS NULL AND
  (project_id IS NOT NULL OR sales_id IS NOT NULL) AND
  (
    is_super_admin(auth.uid()) OR
    (is_admin(auth.uid()) AND company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = events.project_id
      AND (p.owner_user_id = auth.uid() OR p.responsible1_user_id = auth.uid() OR p.responsible2_user_id = auth.uid())
    ))
  )
);