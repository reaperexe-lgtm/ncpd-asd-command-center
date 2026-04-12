
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'is_asd_applicant')::boolean = true THEN
    INSERT INTO public.profiles (id, name, dienstnummer, is_approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'dienstnummer',
      true
    );
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'asd_applicant');
  ELSE
    INSERT INTO public.profiles (id, name, dienstnummer)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'dienstnummer'
    );
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'trial_member');
  END IF;
  RETURN NEW;
END;
$$;
