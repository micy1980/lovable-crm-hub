-- Step 1: Harden RLS on session_2fa_verifications
-- Remove the INSERT policy that allows authenticated users to bypass 2FA
DROP POLICY IF EXISTS "Users can insert their own 2FA verifications" ON public.session_2fa_verifications;

-- Keep SELECT policy so users can see their verification status (optional, but harmless)
-- Already exists: "Users can view their own 2FA verifications"

-- Step 2: Ensure no callable DB function can write to session_2fa_verifications
-- Check if any SECURITY DEFINER function exists that writes to this table
-- If such function exists, revoke execute from authenticated/anon
-- (In this case, we don't have such a function based on the db functions list)

-- The only way to write to session_2fa_verifications is now via service_role (edge functions)