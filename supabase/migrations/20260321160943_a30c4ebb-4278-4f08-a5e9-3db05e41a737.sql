
-- Create pursuits table
CREATE TABLE public.pursuits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  pursuit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pursuer TEXT NOT NULL,
  supporters TEXT,
  vehicle_model TEXT,
  license_plate TEXT,
  description TEXT,
  pilot TEXT,
  co_pilot TEXT,
  left_gunner TEXT,
  right_gunner TEXT
);

ALTER TABLE public.pursuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pursuits" ON public.pursuits FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Approved can view pursuits" ON public.pursuits FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Approved can create pursuits" ON public.pursuits FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND created_by = auth.uid());

-- Create pursuit_photos table
CREATE TABLE public.pursuit_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pursuit_id UUID NOT NULL REFERENCES public.pursuits(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pursuit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pursuit photos" ON public.pursuit_photos FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Approved can view pursuit photos" ON public.pursuit_photos FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Approved can insert pursuit photos" ON public.pursuit_photos FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()));

-- Create storage bucket for pursuit photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pursuit-photos', 'pursuit-photos', true);

CREATE POLICY "Anyone can view pursuit photos" ON storage.objects FOR SELECT USING (bucket_id = 'pursuit-photos');
CREATE POLICY "Authenticated can upload pursuit photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pursuit-photos');
CREATE POLICY "Admins can delete pursuit photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pursuit-photos' AND public.is_admin(auth.uid()));
