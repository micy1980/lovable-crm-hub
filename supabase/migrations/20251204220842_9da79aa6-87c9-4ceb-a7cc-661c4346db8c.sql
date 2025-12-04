-- Create storage bucket for app branding (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to branding bucket
CREATE POLICY "Branding files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Only super admins can upload/update branding files
CREATE POLICY "Super admins can upload branding files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update branding files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete branding files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);