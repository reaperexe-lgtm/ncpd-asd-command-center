-- Unique index on dienstnummer (case-insensitive, ignoring NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_dienstnummer_unique_lower
  ON public.profiles (lower(dienstnummer))
  WHERE dienstnummer IS NOT NULL;

-- Update handle_new_user trigger function to raise on duplicate dienstnummer
-- (rolls back the entire auth.users insert, preventing orphaned accounts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _dn text := NEW.raw_user_meta_data->>'dienstnummer';
BEGIN
  -- Reject duplicate dienstnummer early (case-insensitive)
  IF _dn IS NOT NULL AND length(trim(_dn)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(dienstnummer) = lower(_dn)
    ) THEN
      RAISE EXCEPTION 'Dienstnummer % ist bereits vergeben', _dn
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF (NEW.raw_user_meta_data->>'is_flight_applicant')::boolean = true THEN
    INSERT INTO public.profiles (id, name, dienstnummer, is_approved)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), _dn, true);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'flight_applicant');
  ELSIF (NEW.raw_user_meta_data->>'is_asd_applicant')::boolean = true THEN
    INSERT INTO public.profiles (id, name, dienstnummer, is_approved)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), _dn, true);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'asd_applicant');
  ELSE
    INSERT INTO public.profiles (id, name, dienstnummer)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), _dn);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'trial_member');
  END IF;
  RETURN NEW;
END;
$function$;