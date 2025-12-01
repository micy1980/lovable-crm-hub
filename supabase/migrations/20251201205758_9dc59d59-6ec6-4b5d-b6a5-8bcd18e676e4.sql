-- ==========================================
-- SECURITY FIX: Remove Problematic INSERT Policies
-- ==========================================
-- Remove the "Anyone can insert login attempts" policy
-- Login attempts should only be recorded through the controlled record_login_attempt() function

DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;

-- Add note that login attempts should be recorded via the function
COMMENT ON TABLE public.login_attempts IS 
'Login attempt tracking table. Use record_login_attempt() function to insert records (includes rate limiting). Direct INSERT is blocked for security.';

-- Update the function comment to emphasize its usage
COMMENT ON FUNCTION public.record_login_attempt(text, boolean, text, text) IS 
'REQUIRED: Use this function to record all login attempts. Direct INSERT to login_attempts is blocked. Includes rate limiting (max 10 failed attempts per minute per IP) to prevent flooding attacks.';