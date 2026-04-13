
ALTER TABLE public.profiles
ADD COLUMN discord_notifications JSONB NOT NULL DEFAULT '{"top_woche": true, "top_monat": true, "top_me": true}'::jsonb;
