
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
    ('monthly', NULL, (date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin')) AT TIME ZONE 'Europe/Berlin')),
    ('pursuits_monthly', NULL, (date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin')) AT TIME ZONE 'Europe/Berlin')),
    ('overview_monthly', NULL, (date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin')) AT TIME ZONE 'Europe/Berlin'));
  $$
);
