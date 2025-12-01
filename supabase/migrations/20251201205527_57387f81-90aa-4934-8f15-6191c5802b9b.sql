-- ==========================================
-- SECURITY FIX: Explicit Deny for Unauthenticated Users
-- ==========================================
-- Add explicit deny policies to prevent any unauthenticated access to profiles table

-- Create explicit deny policy for unauthenticated users on profiles
CREATE POLICY "Deny unauthenticated access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

COMMENT ON POLICY "Deny unauthenticated access to profiles" ON public.profiles IS 
'Explicitly deny all operations from unauthenticated users (anon role) to prevent any potential data leakage.';