-- Function to unlock account by user id using security definer (bypasses RLS)
CREATE OR REPLACE FUNCTION public.unlock_account_by_user_id(
  _user_id uuid,
  _unlocked_by uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.locked_accounts
  SET unlocked_at = now(),
      unlocked_by = _unlocked_by
  WHERE user_id = _user_id
    AND unlocked_at IS NULL;
$$;