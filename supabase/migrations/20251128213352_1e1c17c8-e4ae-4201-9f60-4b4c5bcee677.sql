-- Helper function to get locked user ids without relying on table RLS
CREATE OR REPLACE FUNCTION public.get_locked_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.locked_accounts
  WHERE unlocked_at IS NULL
    AND (locked_until IS NULL OR locked_until > now());
$$;