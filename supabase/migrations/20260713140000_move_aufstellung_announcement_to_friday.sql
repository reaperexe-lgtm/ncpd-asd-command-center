-- Die wöchentliche Aufstellungs-Ankündigung soll bereits am Freitag um 12:00 Uhr
-- (deutsche Zeit) gepostet werden, da die Aufstellung selbst erst am Sonntag um
-- 18:00 Uhr stattfindet. Der bestehende Job war zusätzlich noch auf eine alte
-- Projekt-URL/Key konfiguriert und lief nur Sonntag 14:00 UTC -> wird ersetzt.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'asd-weekly-aufstellung-announcement',
    'asd-friday-aufstellung-announcement-summer',
    'asd-friday-aufstellung-announcement-winter'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Freitag 12:00 Uhr Berlin-Zeit = 10:00 UTC im Sommer (CEST, UTC+2)
SELECT cron.schedule(
  'asd-friday-aufstellung-announcement-summer',
  '0 10 * * 5',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/discord-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := jsonb_build_object(
        'type', 'aufstellung_announcement',
        'data', jsonb_build_object('auto', true)
      )
    ) AS request_id
  WHERE EXISTS (
    SELECT 1 FROM public.permission_settings
    WHERE permission_key = 'aufstellung_auto_enabled' AND role = 'true'
  );
  $$
);

-- Freitag 12:00 Uhr Berlin-Zeit = 11:00 UTC im Winter (CET, UTC+1)
SELECT cron.schedule(
  'asd-friday-aufstellung-announcement-winter',
  '0 11 * * 5',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/discord-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := jsonb_build_object(
        'type', 'aufstellung_announcement',
        'data', jsonb_build_object('auto', true)
      )
    ) AS request_id
  WHERE EXISTS (
    SELECT 1 FROM public.permission_settings
    WHERE permission_key = 'aufstellung_auto_enabled' AND role = 'true'
  );
  $$
);
