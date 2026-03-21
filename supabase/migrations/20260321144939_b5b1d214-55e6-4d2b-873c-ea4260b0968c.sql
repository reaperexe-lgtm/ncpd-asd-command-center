
-- Role enum
CREATE TYPE public.app_role AS ENUM ('director', 'co_director', 'supervisor', 'ausbilder', 'trial_ausbilder', 'member', 'trial_member');

-- User roles table (per security guidelines - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'trial_member',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  dienstnummer TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer helper: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer helper: is admin (director or co_director)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director', 'co_director')
  )
$$;

-- Security definer helper: is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND is_approved = TRUE
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'trial_member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS: profiles
CREATE POLICY "Anyone approved can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()) OR id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- RLS: user_roles
CREATE POLICY "Anyone approved can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()) OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Gangs/Families table
CREATE TABLE public.gangs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gangs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can view gangs" ON public.gangs
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins can manage gangs" ON public.gangs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Missions (Einsätze/Protokolle)
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT,
  location_type TEXT NOT NULL,
  custom_location TEXT,
  tatzeit TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspects_count INT NOT NULL DEFAULT 1,
  hostages_count INT NOT NULL DEFAULT 0,
  gang_id UUID REFERENCES public.gangs(id),
  gang_info TEXT,
  protokollschreiber UUID REFERENCES auth.users(id),
  pilot TEXT,
  co_pilot TEXT,
  left_gunner TEXT,
  right_gunner TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can view missions" ON public.missions
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Approved can create missions" ON public.missions
  FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins can manage missions" ON public.missions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Mission vehicles
CREATE TABLE public.mission_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
  vehicle_type TEXT NOT NULL,
  model TEXT NOT NULL,
  custom_model TEXT,
  license_plate TEXT,
  owner_info TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  pearl_color TEXT,
  neon_color TEXT,
  xenon BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.mission_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can view vehicles" ON public.mission_vehicles
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Approved can insert vehicles" ON public.mission_vehicles
  FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "Admins can manage vehicles" ON public.mission_vehicles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Flight licenses
CREATE TABLE public.flight_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_date DATE NOT NULL DEFAULT CURRENT_DATE,
  team TEXT NOT NULL,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'Aktiv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flight_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can view licenses" ON public.flight_licenses
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins can manage licenses" ON public.flight_licenses
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Application bans (Bewerbungssperren)
CREATE TABLE public.application_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.application_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can view bans" ON public.application_bans
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins can manage bans" ON public.application_bans
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Casino balances
CREATE TABLE public.casino_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INT NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.casino_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own balance" ON public.casino_balances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own balance" ON public.casino_balances
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own balance" ON public.casino_balances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Storage bucket for member images and gang images
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Admins can delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND public.is_admin(auth.uid()));
