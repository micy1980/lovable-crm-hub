-- Update send_notification_email function to respect email settings
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  email_subject text;
  email_html text;
  from_email text;
  from_name text;
  should_send boolean;
  notification_setting text;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if we should send email for this notification type
  notification_setting := CASE NEW.type
    WHEN 'task_deadline_soon' THEN 'email_notify_task_deadline'
    WHEN 'task_overdue' THEN 'email_notify_task_deadline'
    WHEN 'task_created' THEN 'email_notify_task_created'
    WHEN 'task_status_changed' THEN 'email_notify_task_status_change'
    ELSE NULL
  END;

  -- If we have a setting for this type, check if it's enabled
  IF notification_setting IS NOT NULL THEN
    SELECT COALESCE((SELECT setting_value::boolean FROM public.system_settings WHERE setting_key = notification_setting), true)
    INTO should_send;
    
    IF NOT should_send THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get from email and name from settings
  SELECT 
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'email_from_address'), 'onboarding@resend.dev'),
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'email_from_name'), 'Mini CRM')
  INTO from_email, from_name;

  -- Build email subject and content
  email_subject := NEW.title;
  email_html := '<h2>' || NEW.title || '</h2><p>' || NEW.message || '</p>';

  -- Call send-email edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'to', jsonb_build_array(user_email),
      'subject', email_subject,
      'html', email_html,
      'from', from_name || ' <' || from_email || '>'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send notification email: %', SQLERRM;
    RETURN NEW;
END;
$$;