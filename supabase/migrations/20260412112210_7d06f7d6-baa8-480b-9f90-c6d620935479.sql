-- Storage policies for assets bucket (license images)
CREATE POLICY "Authorized can upload to assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets' AND can_manage_licenses(auth.uid()));

CREATE POLICY "Authorized can update assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND can_manage_licenses(auth.uid()));

CREATE POLICY "Authorized can delete assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND can_manage_licenses(auth.uid()));
