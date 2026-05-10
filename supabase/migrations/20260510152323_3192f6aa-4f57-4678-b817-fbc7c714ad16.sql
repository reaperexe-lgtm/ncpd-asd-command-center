
-- Grant Team Red full admin-equivalent privileges by extending all permission helper functions

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director','co_director','admin','supervisor','team_red')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_reset_stats(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director','co_director','admin','ausbilder','team_red')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_licenses(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director','co_director','admin','ausbilder','trial_ausbilder','supervisor','team_red')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_delete_protocols(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director','co_director','admin','supervisor','team_red')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_review_exams(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director','co_director','admin','supervisor','ausbilder','trial_ausbilder','team_red')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_hidden_password(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=_user_id AND role IN ('admin','director','supervisor','team_red')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_delete_map_items(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=_user_id AND role IN ('admin','director','co_director','supervisor','ausbilder','trial_ausbilder','team_red')
  )
$$;
