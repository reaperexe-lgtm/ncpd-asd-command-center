
CREATE TABLE public.slideshow_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  name text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.slideshow_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active slideshow images"
ON public.slideshow_images FOR SELECT
USING (true);

CREATE POLICY "Admins can manage slideshow images"
ON public.slideshow_images FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.slideshow_images;
ALTER TABLE public.slideshow_images REPLICA IDENTITY FULL;
