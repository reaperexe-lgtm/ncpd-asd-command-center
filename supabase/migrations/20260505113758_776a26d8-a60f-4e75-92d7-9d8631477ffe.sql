
-- 1. Open up location editing to all approved users
CREATE OR REPLACE FUNCTION public.can_manage_map(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_approved(_user_id) $$;

-- Helper for admin-only delete and hidden-password viewing
CREATE OR REPLACE FUNCTION public.can_view_hidden_password(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','director','supervisor'))
$$;

CREATE OR REPLACE FUNCTION public.can_delete_map_items(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id
    AND role IN ('admin','director','co_director','supervisor','ausbilder','trial_ausbilder'))
$$;

-- 2. Add icon columns to map_locations
ALTER TABLE public.map_locations
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS icon_type text NOT NULL DEFAULT 'pin';

-- 3. Areas (polygons)
CREATE TABLE IF NOT EXISTS public.map_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  background_id uuid,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  fill_opacity numeric NOT NULL DEFAULT 0.25,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_hidden boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'bezirke',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.map_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved view areas" ON public.map_areas FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Approved insert areas" ON public.map_areas FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Approved update areas" ON public.map_areas FOR UPDATE TO authenticated USING (is_approved(auth.uid())) WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Map managers delete areas" ON public.map_areas FOR DELETE TO authenticated USING (can_delete_map_items(auth.uid()));

-- 4. Drawings (lines/routes)
CREATE TABLE IF NOT EXISTS public.map_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  background_id uuid,
  name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#ef4444',
  stroke_width integer NOT NULL DEFAULT 4,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_hidden boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.map_drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved view drawings" ON public.map_drawings FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Approved insert drawings" ON public.map_drawings FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Approved update drawings" ON public.map_drawings FOR UPDATE TO authenticated USING (is_approved(auth.uid())) WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Map managers delete drawings" ON public.map_drawings FOR DELETE TO authenticated USING (can_delete_map_items(auth.uid()));

-- 5. Hidden password (single-row)
CREATE TABLE IF NOT EXISTS public.map_hidden_password (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.map_hidden_password (password) SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.map_hidden_password);
ALTER TABLE public.map_hidden_password ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Privileged view password" ON public.map_hidden_password FOR SELECT TO authenticated USING (can_view_hidden_password(auth.uid()));
CREATE POLICY "Privileged update password" ON public.map_hidden_password FOR UPDATE TO authenticated USING (can_view_hidden_password(auth.uid())) WITH CHECK (can_view_hidden_password(auth.uid()));

-- 6. Validate hidden password (callable by everyone)
CREATE OR REPLACE FUNCTION public.check_map_hidden_password(_password text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.map_hidden_password WHERE password = _password AND length(_password) > 0)
$$;

-- 7. Sidebar nav order
CREATE TABLE IF NOT EXISTS public.nav_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_key text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nav_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated view nav order" ON public.nav_order FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage nav order" ON public.nav_order FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
