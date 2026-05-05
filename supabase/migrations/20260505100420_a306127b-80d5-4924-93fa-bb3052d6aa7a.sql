
-- Multiple maps
CREATE TABLE public.map_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.map_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view backgrounds"
  ON public.map_backgrounds FOR SELECT TO authenticated
  USING (is_approved(auth.uid()));

CREATE POLICY "Map managers can manage backgrounds"
  ON public.map_backgrounds FOR ALL TO authenticated
  USING (can_manage_map(auth.uid()))
  WITH CHECK (can_manage_map(auth.uid()));

CREATE TRIGGER update_map_backgrounds_updated_at
  BEFORE UPDATE ON public.map_backgrounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Migrate existing single background if present
INSERT INTO public.map_backgrounds (name, image_url, sort_order)
SELECT 'Hauptkarte', background_url, 0
FROM public.map_settings
WHERE background_url IS NOT NULL;

-- Add background reference + sort order to locations
ALTER TABLE public.map_locations
  ADD COLUMN background_id uuid REFERENCES public.map_backgrounds(id) ON DELETE CASCADE,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Attach existing locations to first background (if any)
UPDATE public.map_locations
SET background_id = (SELECT id FROM public.map_backgrounds ORDER BY sort_order LIMIT 1)
WHERE background_id IS NULL;
