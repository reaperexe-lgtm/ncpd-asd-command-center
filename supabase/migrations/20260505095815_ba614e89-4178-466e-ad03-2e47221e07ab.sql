
-- Helper for who may manage map
CREATE OR REPLACE FUNCTION public.can_manage_map(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','director','co_director','supervisor','ausbilder','trial_ausbilder')
  )
$$;

-- Locations on the map
CREATE TABLE public.map_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'allgemein',
  color text NOT NULL DEFAULT '#22c55e',
  x_percent numeric NOT NULL,
  y_percent numeric NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view map locations"
  ON public.map_locations FOR SELECT TO authenticated
  USING (is_approved(auth.uid()));

CREATE POLICY "Map managers can manage map locations"
  ON public.map_locations FOR ALL TO authenticated
  USING (can_manage_map(auth.uid()))
  WITH CHECK (can_manage_map(auth.uid()));

CREATE TRIGGER update_map_locations_updated_at
  BEFORE UPDATE ON public.map_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Single-row settings (background image url)
CREATE TABLE public.map_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  background_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view map settings"
  ON public.map_settings FOR SELECT TO authenticated
  USING (is_approved(auth.uid()));

CREATE POLICY "Map managers can manage map settings"
  ON public.map_settings FOR ALL TO authenticated
  USING (can_manage_map(auth.uid()))
  WITH CHECK (can_manage_map(auth.uid()));

INSERT INTO public.map_settings (background_url) VALUES (NULL);
