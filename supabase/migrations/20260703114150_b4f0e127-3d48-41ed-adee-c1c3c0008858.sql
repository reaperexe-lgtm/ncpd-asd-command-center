
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Public read for content that anon should see (login page, changelog etc.)
GRANT SELECT ON public.changelogs TO anon;
GRANT SELECT ON public.profiles TO anon;

NOTIFY pgrst, 'reload schema';
