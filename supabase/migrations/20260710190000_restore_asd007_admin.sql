-- Restore full admin access for the ASD-007 account if it exists in auth/users/profiles
DO $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT u.id
  INTO _user_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE
    (p.name ILIKE '%asd-007%' OR p.name ILIKE 'asd-007' OR p.name ILIKE 'asd007' OR p.name ILIKE '%dn-00%' OR p.dienstnummer ILIKE '%007%' OR p.dienstnummer ILIKE '%dn-00%' OR u.email ILIKE '%asd-007%' OR u.email ILIKE '%asd007%' OR u.email ILIKE '%dn-00%' OR COALESCE(u.raw_user_meta_data->>'name', '') ILIKE '%asd-007%' OR COALESCE(u.raw_user_meta_data->>'name', '') ILIKE 'asd007' OR COALESCE(u.raw_user_meta_data->>'name', '') ILIKE '%dn-00%')
  ORDER BY u.created_at
  LIMIT 1;

  IF _user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin'), (_user_id, 'ausbilder')
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles
    SET is_approved = TRUE,
        updated_at = now()
    WHERE id = _user_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director', 'co_director', 'admin', 'supervisor', 'team_red')
  )
$$;
