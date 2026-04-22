-- Update handle_new_user to support flight_applicant signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.raw_user_meta_data->>'is_flight_applicant')::boolean = true THEN
    INSERT INTO public.profiles (id, name, dienstnummer, is_approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'dienstnummer',
      true
    );
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'flight_applicant');
  ELSIF (NEW.raw_user_meta_data->>'is_asd_applicant')::boolean = true THEN
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
$function$;

-- Allow flight_applicant to view modules + their own progress
DROP POLICY IF EXISTS "Approved and applicants can view asd modules" ON public.asd_training_modules;
CREATE POLICY "Approved and applicants can view asd modules"
ON public.asd_training_modules
FOR SELECT
TO authenticated
USING (
  is_approved(auth.uid())
  OR has_role(auth.uid(), 'asd_applicant'::app_role)
  OR has_role(auth.uid(), 'flight_applicant'::app_role)
);

-- asd_applicant_progress: flight_applicant can view their own (already covered by applicant_id = auth.uid() policy)
-- No change needed.