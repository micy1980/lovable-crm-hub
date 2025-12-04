-- Enable realtime for login_attempts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_attempts;