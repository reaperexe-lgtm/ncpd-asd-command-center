ALTER TABLE public.practical_exam_results
  ADD COLUMN IF NOT EXISTS released_to_applicant boolean NOT NULL DEFAULT false;

ALTER TABLE public.practical_exam_results REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'practical_exam_results'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.practical_exam_results';
  END IF;
END $$;