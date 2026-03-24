-- Allow director, co_director, ausbilder, trial_ausbilder to manage flight licenses
CREATE OR REPLACE FUNCTION public.can_manage_licenses(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director', 'co_director', 'admin', 'ausbilder', 'trial_ausbilder')
  )
$$;

DROP POLICY IF EXISTS "Admins can manage licenses" ON public.flight_licenses;
CREATE POLICY "Authorized can manage licenses" ON public.flight_licenses FOR ALL TO authenticated USING (can_manage_licenses(auth.uid()));

-- Allow reset role check
CREATE OR REPLACE FUNCTION public.can_reset_stats(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director', 'co_director', 'admin', 'ausbilder')
  )
$$;

DROP POLICY IF EXISTS "Admins can manage resets" ON public.stats_resets;
CREATE POLICY "Authorized can manage resets" ON public.stats_resets FOR ALL TO authenticated USING (can_reset_stats(auth.uid()));