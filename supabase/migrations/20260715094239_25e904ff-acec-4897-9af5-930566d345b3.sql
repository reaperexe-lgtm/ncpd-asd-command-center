DROP TABLE IF EXISTS public.sr_theory_exam_results CASCADE;
DROP TABLE IF EXISTS public.sr_training_progress CASCADE;
DROP TABLE IF EXISTS public.sr_training_signups CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_sr_training;

DROP TABLE IF EXISTS public.map_locations CASCADE;
DROP TABLE IF EXISTS public.map_areas CASCADE;
DROP TABLE IF EXISTS public.map_drawings CASCADE;
DROP TABLE IF EXISTS public.map_hidden_password CASCADE;
DROP TABLE IF EXISTS public.map_settings CASCADE;
DROP TABLE IF EXISTS public.map_backgrounds CASCADE;