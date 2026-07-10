
-- Recreate missing trigger on auth.users so new signups get profile + role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill Pablo Morales (registered as ASD applicant, missing profile/role)
INSERT INTO public.profiles (id, name, dienstnummer, is_approved)
VALUES ('0db6a096-0574-4bff-bfd0-275328647f49', 'Pablo Morales', 'PD-15', true)
ON CONFLICT (id) DO UPDATE SET is_approved = true;

INSERT INTO public.user_roles (user_id, role)
VALUES ('0db6a096-0574-4bff-bfd0-275328647f49', 'asd_applicant')
ON CONFLICT (user_id, role) DO NOTHING;
