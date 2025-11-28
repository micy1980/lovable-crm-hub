-- Add unique constraint to locked_accounts.user_id
-- This is required for the ON CONFLICT clause to work properly
ALTER TABLE public.locked_accounts 
  DROP CONSTRAINT IF EXISTS locked_accounts_user_id_key;

ALTER TABLE public.locked_accounts 
  ADD CONSTRAINT locked_accounts_user_id_key UNIQUE (user_id);