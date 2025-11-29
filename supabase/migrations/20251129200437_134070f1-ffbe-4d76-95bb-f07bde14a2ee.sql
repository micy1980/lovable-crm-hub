-- Ensure get_locked_accounts_with_details only returns *currently active* locks
CREATE OR REPLACE FUNCTION public.get_locked_accounts_with_details()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  locked_at timestamp with time zone,
  locked_until timestamp with time zone,
  unlocked_at timestamp with time zone,
  unlocked_by uuid,
  locked_by_system boolean,
  reason text,
  user_email text,
  user_full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    la.id,
    la.user_id,
    la.locked_at,
    la.locked_until,
    la.unlocked_at,
    la.unlocked_by,
    la.locked_by_system,
    la.reason,
    p.email as user_email,
    p.full_name as user_full_name
  FROM public.locked_accounts la
  JOIN public.profiles p ON p.id = la.user_id
  WHERE la.unlocked_at IS NULL
    AND (la.locked_until IS NULL OR la.locked_until > now())
  ORDER BY la.locked_at DESC;
$$;