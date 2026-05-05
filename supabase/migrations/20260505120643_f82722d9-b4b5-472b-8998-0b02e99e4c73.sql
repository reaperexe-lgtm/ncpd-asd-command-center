ALTER TABLE public.map_locations REPLICA IDENTITY FULL;
ALTER TABLE public.map_areas REPLICA IDENTITY FULL;
ALTER TABLE public.map_drawings REPLICA IDENTITY FULL;
ALTER TABLE public.map_backgrounds REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_locations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_areas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_drawings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_backgrounds;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;