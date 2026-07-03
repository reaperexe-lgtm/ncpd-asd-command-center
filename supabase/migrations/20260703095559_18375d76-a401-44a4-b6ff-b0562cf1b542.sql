
-- 1. theory_exam_questions: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view questions" ON public.theory_exam_questions;
CREATE POLICY "Authenticated can view questions"
  ON public.theory_exam_questions
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Storage: add SELECT policies gating list/API reads to authenticated for the three public buckets
DROP POLICY IF EXISTS "Authenticated can read avatars" ON storage.objects;
CREATE POLICY "Authenticated can read avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated can read pursuit photos" ON storage.objects;
CREATE POLICY "Authenticated can read pursuit photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pursuit-photos');

DROP POLICY IF EXISTS "Authenticated can read assets" ON storage.objects;
CREATE POLICY "Authenticated can read assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assets');

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon and public.
-- Authenticated retains EXECUTE only where needed by client/RLS references.
REVOKE EXECUTE ON FUNCTION public.can_delete_map_items(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_delete_protocols(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_licenses(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_map(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_reset_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_review_exams(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_hidden_password(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_map_hidden_password(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;

-- Revoke authenticated EXECUTE on functions that are only referenced from RLS/other definer funcs
-- (RLS policy references don't require the caller to hold EXECUTE).
REVOKE EXECUTE ON FUNCTION public.can_delete_map_items(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_delete_protocols(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_licenses(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_map(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_reset_stats(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_review_exams(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_hidden_password(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_map_hidden_password(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM authenticated;
-- Keep has_role and is_admin executable by authenticated (called directly from client code in some places)
