CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'asd-saturday-aufstellung-thread-summer',
    'asd-saturday-aufstellung-thread-winter'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Samstag 10:00 Uhr Berlin-Zeit = 08:00 UTC im Sommer (CEST, UTC+2)
SELECT cron.schedule(
  'asd-saturday-aufstellung-thread-summer',
  '0 8 * * 6',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/discord-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := jsonb_build_object('type', 'aufstellung_saturday_thread', 'data', jsonb_build_object())
    ) AS request_id;
  $$
);

-- Samstag 10:00 Uhr Berlin-Zeit = 09:00 UTC im Winter (CET, UTC+1)
SELECT cron.schedule(
  'asd-saturday-aufstellung-thread-winter',
  '0 9 * * 6',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/discord-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := jsonb_build_object('type', 'aufstellung_saturday_thread', 'data', jsonb_build_object())
    ) AS request_id;
  $$
);
