-- Allow system to lock accounts (anyone can insert)
CREATE POLICY "System can insert locked accounts"
  ON public.locked_accounts
  FOR INSERT
  WITH CHECK (true);