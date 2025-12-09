-- FIX 1: notifications INSERT policy - korlátozás
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (
    -- Only allow inserts from authenticated users for their own notifications
    -- OR from service role (edge functions)
    (auth.uid() = user_id) OR 
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_companies uc 
      WHERE uc.user_id = auth.uid() AND uc.company_id = notifications.company_id
    ))
  );

-- FIX 2: approval_workflows - add 2FA check
DROP POLICY IF EXISTS "Admins can update approvals" ON public.approval_workflows;
CREATE POLICY "Admins can update approvals" ON public.approval_workflows
  FOR UPDATE
  USING (
    is_2fa_verified(auth.uid()) AND (
      is_super_admin(auth.uid()) OR 
      EXISTS (
        SELECT 1 FROM user_company_permissions ucp
        WHERE ucp.user_id = auth.uid() 
          AND ucp.company_id = approval_workflows.company_id 
          AND ucp.role = 'ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Users can create approval requests" ON public.approval_workflows;
CREATE POLICY "Users can create approval requests" ON public.approval_workflows
  FOR INSERT
  WITH CHECK (
    is_2fa_verified(auth.uid()) AND
    auth.uid() = requested_by AND 
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = approval_workflows.company_id
    )
  );

DROP POLICY IF EXISTS "Users can view company approvals" ON public.approval_workflows;
CREATE POLICY "Users can view company approvals" ON public.approval_workflows
  FOR SELECT
  USING (
    is_2fa_verified(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = approval_workflows.company_id
    )
  );

-- FIX 3: comments - add 2FA check to INSERT
DROP POLICY IF EXISTS "Users can create comments in their companies" ON public.comments;
CREATE POLICY "Users can create comments in their companies" ON public.comments
  FOR INSERT
  WITH CHECK (
    is_2fa_verified(auth.uid()) AND
    auth.uid() = user_id AND 
    (is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = comments.company_id
    ))
  );

-- FIX 4: time_entries - add 2FA check to SELECT
DROP POLICY IF EXISTS "Users can view company time entries" ON public.time_entries;
CREATE POLICY "Users can view company time entries" ON public.time_entries
  FOR SELECT
  USING (
    is_2fa_verified(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = time_entries.company_id
    )
  );

-- FIX 5: favorites - add 2FA check
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.favorites;
CREATE POLICY "Users can add their own favorites" ON public.favorites
  FOR INSERT
  WITH CHECK (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own favorites" ON public.favorites;
CREATE POLICY "Users can remove their own favorites" ON public.favorites
  FOR DELETE
  USING (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT
  USING (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);

-- FIX 6: dashboard_widgets - add 2FA check
DROP POLICY IF EXISTS "Users can delete their own widget preferences" ON public.dashboard_widgets;
CREATE POLICY "Users can delete their own widget preferences" ON public.dashboard_widgets
  FOR DELETE
  USING (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own widget preferences" ON public.dashboard_widgets;
CREATE POLICY "Users can insert their own widget preferences" ON public.dashboard_widgets
  FOR INSERT
  WITH CHECK (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own widget preferences" ON public.dashboard_widgets;
CREATE POLICY "Users can update their own widget preferences" ON public.dashboard_widgets
  FOR UPDATE
  USING (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own widget preferences" ON public.dashboard_widgets;
CREATE POLICY "Users can view their own widget preferences" ON public.dashboard_widgets
  FOR SELECT
  USING (is_2fa_verified(auth.uid()) AND auth.uid() = user_id);