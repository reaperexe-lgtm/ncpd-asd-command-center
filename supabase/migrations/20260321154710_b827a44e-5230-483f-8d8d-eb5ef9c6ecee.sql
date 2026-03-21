
-- Add category column to gangs
ALTER TABLE public.gangs ADD COLUMN category text NOT NULL DEFAULT 'Familie';

-- Update team_license_limits: clear old data, insert for Teams not Units
DELETE FROM public.team_license_limits;

INSERT INTO public.team_license_limits (team, max_licenses) VALUES
  ('Team Red', 0),
  ('Team Blue', 0),
  ('Team Gold', 0),
  ('Team Silver', 0);
