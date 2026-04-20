-- Wöchentlicher Auto-Reset (Sonntag 18:20 deutscher Zeit = 16:20 UTC im Sommer / 17:20 UTC im Winter)
-- Wir nutzen 17:20 UTC als Kompromiss, dies wird zur ASD-Woche (Sonntag) automatisiert
-- Erweitert: weekly + pursuits + overview gemeinsam

-- Sicherstellen dass extension installiert ist
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Alte Jobs entfernen falls vorhanden
DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'asd-weekly-stats-reset',
    'asd-monthly-stats-reset',
    'asd-weekly-full-reset',
    'asd-monthly-full-reset'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Wöchentlicher Reset: Sonntag 16:20 UTC (= 18:20 deutsche Zeit Sommer)
-- Inserts für: weekly, pursuits, overview (Übersicht / Raubarten der Woche)
SELECT cron.schedule(
  'asd-weekly-full-reset',
  '20 16 * * 0',
  $$
  INSERT INTO public.stats_resets (reset_type, reset_by, reset_at) VALUES
    ('weekly', NULL, now()),
    ('pursuits', NULL, now()),
    ('overview', NULL, now());
  $$
);

-- Monatlicher Reset: 1. des Monats um 00:05 UTC
-- Inserts für: monthly, pursuits_monthly, overview_monthly (Monatsübersicht/Raubarten Monat)
SELECT cron.schedule(
  'asd-monthly-full-reset',
  '5 0 1 * *',
  $$
  INSERT INTO public.stats_resets (reset_type, reset_by, reset_at) VALUES
    ('monthly', NULL, now()),
    ('pursuits_monthly', NULL, now()),
    ('overview_monthly', NULL, now());
  $$
);