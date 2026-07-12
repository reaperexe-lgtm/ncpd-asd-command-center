-- Wöchentliche Inaktivitäts-Warnung: Tracking-Tabelle, Settings & Cron-Job

CREATE TABLE IF NOT EXISTS public.weekly_inactivity_warnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start timestamptz NOT NULL,
  missions_count integer NOT NULL DEFAULT 0,
  pursuits_count integer NOT NULL DEFAULT 0,
  warned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_inactivity_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inactivity warnings"
ON public.weekly_inactivity_warnings FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view own inactivity warnings"
ON public.weekly_inactivity_warnings FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_weekly_inactivity_user_week ON public.weekly_inactivity_warnings (user_id, week_start);

-- Feature-Schalter & Ziel-Channel (Director-Chat) — wie bei aufstellung_* / stats_ping_*
INSERT INTO public.permission_settings (permission_key, role)
SELECT 'inactivity_check_enabled', 'true'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'inactivity_check_enabled');

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'inactivity_director_channel_id', ''
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'inactivity_director_channel_id');

-- Cron: läuft zum wöchentlichen ASD-Reset (Sonntag 18:20 Europe/Berlin).
-- Zwei Aufrufe (Sommer-/Winterzeit), die Function filtert selbst per Berlin-Stunde.
DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'asd-weekly-inactivity-check-summer',
    'asd-weekly-inactivity-check-winter'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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
