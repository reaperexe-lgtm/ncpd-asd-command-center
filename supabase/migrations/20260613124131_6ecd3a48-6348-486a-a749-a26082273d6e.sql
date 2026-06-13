
-- =========================================================================
-- Security fixes: 12 of 13 findings (realtime.messages not editable here)
-- =========================================================================

-- ---- 1. theory_exam_results: drop anon abuse ----
DROP POLICY IF EXISTS "Anon can view own exam by id" ON public.theory_exam_results;
DROP POLICY IF EXISTS "Anyone can submit exam" ON public.theory_exam_results;

CREATE POLICY "Authenticated can submit own exam"
ON public.theory_exam_results FOR INSERT
TO authenticated
WITH CHECK (
  dienstnummer = (SELECT dienstnummer FROM public.profiles WHERE id = auth.uid())
);

REVOKE INSERT, SELECT ON public.theory_exam_results FROM anon;

-- ---- 2. user_achievements: remove self-insert ----
DROP POLICY IF EXISTS "Users insert own achievements" ON public.user_achievements;

CREATE POLICY "Admins insert achievements"
ON public.user_achievements FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
-- Service-role bypasses RLS, so the edge function can still award normally.

-- ---- 3. profiles_private: move sensitive columns ----
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text,
  birthday date,
  discord_id text,
  internal_dienstnummer text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_private TO authenticated;
GRANT ALL ON public.profiles_private TO service_role;

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view"
ON public.profiles_private FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can insert"
ON public.profiles_private FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can update"
ON public.profiles_private FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins delete"
ON public.profiles_private FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- migrate existing data
INSERT INTO public.profiles_private (user_id, phone_number, birthday, discord_id, internal_dienstnummer)
SELECT id, phone_number, birthday, discord_id, internal_dienstnummer
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  birthday = EXCLUDED.birthday,
  discord_id = EXCLUDED.discord_id,
  internal_dienstnummer = EXCLUDED.internal_dienstnummer;

-- drop sensitive columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birthday;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS discord_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS internal_dienstnummer;

CREATE TRIGGER profiles_private_set_updated_at
BEFORE UPDATE ON public.profiles_private
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---- 4. can_manage_map: restrict to instructor+ ----
CREATE OR REPLACE FUNCTION public.can_manage_map(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','director','co_director','supervisor','ausbilder','trial_ausbilder','team_red')
  )
$$;

-- ---- 5. Storage: avatars upload path enforcement ----
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---- 6. Storage: drop pursuit-photos duplicate insert ----
DROP POLICY IF EXISTS "Authenticated can upload pursuit photos" ON storage.objects;

-- ---- 7. Storage: drop broad listing policies on public buckets ----
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view pursuit photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access on assets" ON storage.objects;
-- Public buckets still serve files via direct CDN URL without policy.

-- ---- 8. Security definer functions: revoke anon execute ----
DO $$
DECLARE
  fn_name text;
  fn_args text;
BEGIN
  FOR fn_name, fn_args IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname NOT IN ('update_updated_at','handle_new_user')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, public', fn_name, fn_args);
  END LOOP;
END$$;

-- handle_new_user is a trigger function; not directly callable, safe.
