CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'aufstellung_ort', 'Vespucci Police Department Dach'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'aufstellung_ort');

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'aufstellung_next_at', ''
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'aufstellung_next_at');

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'aufstellung_auto_enabled', 'true'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'aufstellung_auto_enabled');

DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname = 'asd-weekly-aufstellung-announcement';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'asd-weekly-aufstellung-announcement',
  '0 14 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://qfstjmzklpnftoablrss.supabase.co/functions/v1/discord-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc3RqbXprbHBuZnRvYWJscnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTUyMzIsImV4cCI6MjA4OTY3MTIzMn0.TOCJi4xj3zepP18I7HWCNEYBW9-C8HfoegcQ8xV5TQA'
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