ALTER TABLE public.changelogs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.changelogs;