-- Add explicit deny policies for unauthenticated access to profiles
-- This ensures no public access even if other policies exist
CREATE POLICY "Explicit deny unauthenticated SELECT on profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

CREATE POLICY "Explicit deny unauthenticated INSERT on profiles"
ON public.profiles FOR INSERT
TO anon
WITH CHECK (false);

-- Add explicit deny policies for unauthenticated access to login_attempts
CREATE POLICY "Explicit deny anon INSERT on login_attempts"
ON public.login_attempts FOR INSERT
TO anon
WITH CHECK (false);

-- Ensure login_attempts can only be read by super admins (policy already exists but adding explicit deny for anon)
CREATE POLICY "Explicit deny anon SELECT on login_attempts"
ON public.login_attempts FOR SELECT
TO anon
USING (false);