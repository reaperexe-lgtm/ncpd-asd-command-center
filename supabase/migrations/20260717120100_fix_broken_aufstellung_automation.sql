-- Fix: Die automatische Freitags-Aufstellungs-Ankündigung wurde nicht
-- verschickt. Diese Migration ist bewusst idempotent (kann gefahrlos mehrfach
-- laufen) und behebt zwei mögliche stille Fehlerursachen:
--
--   1. permission_settings-Zeilen (aufstellung_auto_enabled/_next_at/_ort)
--      fehlen oder aufstellung_auto_enabled steht nicht auf 'true'.
--      -> Das Admin-Panel speichert diese Werte per .update() statt .upsert();
--         fehlt die Zeile, schlägt das *lautlos* fehl (kein Error, kein Insert).
--   2. Alle Discord-relevanten Cron-Jobs werden hier sauber neu registriert,
--      falls sie durch eine vorherige Migration versehentlich unscheduled
--      wurden oder nie angelegt wurden.
--
-- Zusätzlich wird ein neuer Settings-Key für einen Alarm-Kanal angelegt: die
-- Edge Functions posten dort künftig automatisch, wenn eine automatisierte
-- Aktion fehlschlägt (siehe supabase/functions/_shared/automation-alert.ts).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Sicherstellen, dass alle benötigten Settings-Zeilen existieren.
INSERT INTO public.permission_settings (permission_key, role)
SELECT 'aufstellung_next_at', ''
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'aufstellung_next_at');

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'aufstellung_ort', 'Vespucci Police Department Dach'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'aufstellung_ort');

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'aufstellung_auto_enabled', 'true'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'aufstellung_auto_enabled');

-- Automatik jetzt zwangsweise wieder aktivieren, da sie erwiesenermaßen nicht
-- gelaufen ist. Falls sie absichtlich deaktiviert war, im Admin-Panel wieder
-- ausschalten.
UPDATE public.permission_settings
SET role = 'true'
WHERE permission_key = 'aufstellung_auto_enabled' AND role IS DISTINCT FROM 'true';

-- Neuer Alarm-Kanal-Setting (leer = Fallback auf DISCORD_DIRECTOR_CHANNEL_ID /
-- DISCORD_ANNOUNCEMENTS_CHANNEL_ID Secret in den Edge Functions).
INSERT INTO public.permission_settings (permission_key, role)
SELECT 'automation_alert_channel_id', ''
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'automation_alert_channel_id');

-- 2) Alle Discord-Automations-Cron-Jobs sauber neu registrieren (unschedule +
-- schedule), damit ein evtl. verlorener/kaputter Job repariert wird. Inhalte
-- 1:1 aus den bisherigen Migrationen übernommen, keine Verhaltensänderung.

DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'asd-friday-aufstellung-announcement-summer',
    'asd-friday-aufstellung-announcement-winter',
    'asd-saturday-aufstellung-thread-summer',
    'asd-saturday-aufstellung-thread-winter',
    'asd-weekly-discord-report-summer',
    'asd-weekly-discord-report-winter',
    'asd-weekly-inactivity-check-summer',
    'asd-weekly-inactivity-check-winter',
    'asd-sanction-reminder-check-summer',
    'asd-sanction-reminder-check-winter'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Freitag 12:00 Uhr Berlin-Zeit = 10:00 UTC (Sommer) / 11:00 UTC (Winter)
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
      body := jsonb_build_object('type', 'aufstellung_announcement', 'data', jsonb_build_object('auto', true))
    ) AS request_id
  WHERE EXISTS (
    SELECT 1 FROM public.permission_settings
    WHERE permission_key = 'aufstellung_auto_enabled' AND role = 'true'
  );
  $$
);

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
      body := jsonb_build_object('type', 'aufstellung_announcement', 'data', jsonb_build_object('auto', true))
    ) AS request_id
  WHERE EXISTS (
    SELECT 1 FROM public.permission_settings
    WHERE permission_key = 'aufstellung_auto_enabled' AND role = 'true'
  );
  $$
);

-- Samstag 10:00 Uhr Berlin-Zeit = 08:00 UTC (Sommer) / 09:00 UTC (Winter)
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

-- Wochenreport: Sonntag 12:00 Uhr Berlin-Zeit = 10:00 UTC (Sommer) / 11:00 UTC (Winter)
SELECT cron.schedule(
  'asd-weekly-discord-report-summer',
  '0 10 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/discord-weekly-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'asd-weekly-discord-report-winter',
  '0 11 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/discord-weekly-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Inaktivitäts-Check: Sonntag 18:25 Uhr Berlin-Zeit = 16:25 UTC (Sommer) / 17:25 UTC (Winter)
SELECT cron.schedule(
  'asd-weekly-inactivity-check-summer',
  '25 16 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/weekly-inactivity-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'asd-weekly-inactivity-check-winter',
  '25 17 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/weekly-inactivity-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Sanktions-Reminder: täglich 09:00 Berlin = 07:00 UTC (Sommer) / 08:00 UTC (Winter)
SELECT cron.schedule(
  'asd-sanction-reminder-check-summer',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/sanction-reminder-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'asd-sanction-reminder-check-winter',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ostuzusncwkmfwzuhhmc.supabase.co/functions/v1/sanction-reminder-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHV6dXNuY3drbWZ3enVoaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2NjcsImV4cCI6MjA5OTI1MzY2N30.D8lA2Hnv474rpVrb0lgJHh7SokAyRH9iTOTzKaRqXk8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
