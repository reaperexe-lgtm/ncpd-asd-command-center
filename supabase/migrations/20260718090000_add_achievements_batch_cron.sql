-- Fix: Achievements (inkl. Wochenziel-Discord-Meldung an die Direction)
-- wurden nur vergeben/gemeldet, wenn ein Nutzer selbst seine Achievements-
-- Seite öffnete (award-achievements läuft nur mit dessen eigenem Login).
-- Dieser Cron ruft stattdessen periodisch die neue Service-Role-Function
-- award-achievements-batch auf, die ALLE freigeschalteten Nutzer serverseitig
-- prüft — unabhängig davon, ob/wann jemand die Seite besucht.
--
-- Der erste Lauf holt automatisch alle bisher verpassten Vergaben und
-- Wochenziel-Meldungen nach (Backfill), danach läuft es alle 10 Minuten weiter.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('asd-achievements-batch-check');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'asd-achievements-batch-check',
  '*/10 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/award-achievements-batch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
