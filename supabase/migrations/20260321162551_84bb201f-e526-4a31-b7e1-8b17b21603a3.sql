
-- Allow approved users to upload to pursuit-photos bucket
CREATE POLICY "Approved can upload pursuit photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pursuit-photos' AND is_approved(auth.uid()));

-- Allow approved users to delete their pursuit photos (not just admins)
DROP POLICY IF EXISTS "Admins can delete pursuit photos" ON storage.objects;
CREATE POLICY "Approved can delete pursuit photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pursuit-photos' AND is_approved(auth.uid()));
