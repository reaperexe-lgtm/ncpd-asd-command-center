INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access on assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'assets');