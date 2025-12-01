-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_created', 'task_deadline_soon', 'task_overdue', 'sales_created', 'sales_updated', 'project_created', 'project_updated')),
  title text NOT NULL,
  message text NOT NULL,
  entity_type text CHECK (entity_type IN ('task', 'project', 'sales')),
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = user_id
  AND is_2fa_verified(auth.uid())
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (
  auth.uid() = user_id
  AND is_2fa_verified(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (
  auth.uid() = user_id
  AND is_2fa_verified(auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for task events
CREATE OR REPLACE FUNCTION public.notify_task_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title text;
  task_company_id uuid;
  notification_type text;
  notification_title text;
  notification_message text;
BEGIN
  -- Get task details
  IF TG_OP = 'INSERT' THEN
    task_title := NEW.title;
    task_company_id := NEW.company_id;
    notification_type := 'task_created';
    notification_title := 'Új feladat';
    notification_message := 'Új feladat létrehozva: ' || task_title;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    task_title := NEW.title;
    task_company_id := NEW.company_id;
    notification_type := 'task_created';
    notification_title := 'Feladat frissítve';
    notification_message := 'Feladat állapota megváltozott: ' || task_title;
  ELSE
    RETURN NEW;
  END IF;

  -- Create notification for responsible user if exists
  IF NEW.responsible_user_id IS NOT NULL AND NEW.responsible_user_id != NEW.created_by THEN
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      entity_type,
      entity_id
    ) VALUES (
      NEW.responsible_user_id,
      task_company_id,
      notification_type,
      notification_title,
      notification_message,
      'task',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task notifications
CREATE TRIGGER trigger_notify_task_event
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_event();

-- Function to check and create overdue/deadline notifications
CREATE OR REPLACE FUNCTION public.check_task_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_record record;
  days_until_deadline integer;
BEGIN
  -- Check all active tasks with deadlines
  FOR task_record IN
    SELECT t.*, p.full_name as responsible_name
    FROM public.tasks t
    LEFT JOIN public.profiles p ON p.id = t.responsible_user_id
    WHERE t.deleted_at IS NULL
      AND t.deadline IS NOT NULL
      AND t.status != 'completed'
      AND t.responsible_user_id IS NOT NULL
  LOOP
    days_until_deadline := EXTRACT(DAY FROM (task_record.deadline - now()));
    
    -- Task is overdue
    IF days_until_deadline < 0 THEN
      -- Check if overdue notification already exists for today
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE entity_id = task_record.id
          AND type = 'task_overdue'
          AND created_at::date = now()::date
      ) THEN
        INSERT INTO public.notifications (
          user_id,
          company_id,
          type,
          title,
          message,
          entity_type,
          entity_id
        ) VALUES (
          task_record.responsible_user_id,
          task_record.company_id,
          'task_overdue',
          'Lejárt feladat',
          'A feladat határideje lejárt: ' || task_record.title,
          'task',
          task_record.id
        );
      END IF;
    -- Deadline is within 3 days
    ELSIF days_until_deadline <= 3 AND days_until_deadline >= 0 THEN
      -- Check if deadline soon notification already exists for today
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE entity_id = task_record.id
          AND type = 'task_deadline_soon'
          AND created_at::date = now()::date
      ) THEN
        INSERT INTO public.notifications (
          user_id,
          company_id,
          type,
          title,
          message,
          entity_type,
          entity_id
        ) VALUES (
          task_record.responsible_user_id,
          task_record.company_id,
          'task_deadline_soon',
          'Közeli határidő',
          'Feladat határideje ' || days_until_deadline || ' napon belül: ' || task_record.title,
          'task',
          task_record.id
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;