
-- Update handle_new_user to also store dienstnummer from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, dienstnummer)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'dienstnummer'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'trial_member');
  RETURN NEW;
END;
$$;
