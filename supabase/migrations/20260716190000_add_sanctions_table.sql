-- A.S.D. Sanktionen: Tabelle, RLS (nur Director/Co-Director) & täglicher
-- Reminder-Cron für unbezahlte Sanktionen am 6. Tag.

CREATE TABLE IF NOT EXISTS public.sanctions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_name text NOT NULL,
  target_dienstnummer text,
  target_discord_id text,
  paragraph text NOT NULL,
  zeugen text,
  tatzeitraum_start date NOT NULL,
  tatzeitraum_end date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notiz text,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_by_name text NOT NULL,
  issued_by_discord_id text,
  status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'bezahlt')),
  paid_at timestamptz,
  due_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  reminder_sent_at timestamptz,
  discord_message_id text,
  discord_reason_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;

-- is_admin() prüft bereits exakt auf role IN ('director','co_director')
CREATE POLICY "Direction can view sanctions"
ON public.sanctions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Direction can create sanctions"
ON public.sanctions FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Direction can update sanctions"
ON public.sanctions FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Direction can delete sanctions"
ON public.sanctions FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sanctions_status ON public.sanctions (status);
CREATE INDEX IF NOT EXISTS idx_sanctions_due_at ON public.sanctions (due_at);

CREATE TRIGGER sanctions_set_updated_at
BEFORE UPDATE ON public.sanctions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Täglicher Check (zweifacher Aufruf für Sommer-/Winterzeit, wie bei den
-- übrigen Cron-Jobs): die Function selbst filtert per Berlin-Stunde.
DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'asd-sanction-reminder-check-summer',
    'asd-sanction-reminder-check-winter'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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
