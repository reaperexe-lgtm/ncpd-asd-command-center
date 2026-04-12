
ALTER TABLE public.asd_applicant_progress ADD COLUMN time_value text;
ALTER TABLE public.asd_training_modules ADD COLUMN has_time_field boolean NOT NULL DEFAULT false;
ALTER TABLE public.flight_licenses ADD COLUMN image_url text;
