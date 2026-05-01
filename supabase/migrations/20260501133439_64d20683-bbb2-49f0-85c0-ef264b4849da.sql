
-- 1) Bestehende Mai-Resets auf Monatsanfang korrigieren
UPDATE public.stats_resets
SET reset_at = date_trunc('month', reset_at)
WHERE reset_type IN ('monthly','pursuits_monthly','overview_monthly')
  AND reset_at >= '2026-05-01 00:00:00+00'
  AND reset_at <  '2026-05-01 01:00:00+00';

-- 2) Cron-Job neu schedulen, damit reset_at auf Monatsanfang gesetzt wird
DO $$
BEGIN
  PERFORM cron.unschedule('asd-monthly-full-reset');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'asd-monthly-full-reset',
  '5 0 1 * *',
  $$
  INSERT INTO public.stats_resets (reset_type, reset_by, reset_at) VALUES
    ('monthly', NULL, date_trunc('month', now())),
    ('pursuits_monthly', NULL, date_trunc('month', now())),
    ('overview_monthly', NULL, date_trunc('month', now()));
  $$
);
