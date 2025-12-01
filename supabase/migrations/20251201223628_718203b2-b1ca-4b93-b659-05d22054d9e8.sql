-- Create function to send email notification when a new notification is created
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
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build email subject and content
  email_subject := NEW.title;
  email_html := '<h2>' || NEW.title || '</h2><p>' || NEW.message || '</p>';

  -- Call send-email edge function asynchronously using pg_net
  -- Note: This requires pg_net extension which is available in Supabase
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'to', jsonb_build_array(user_email),
      'subject', email_subject,
      'html', email_html
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

-- Create trigger to send email on new notification
DROP TRIGGER IF EXISTS send_notification_email_trigger ON public.notifications;
CREATE TRIGGER send_notification_email_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email();