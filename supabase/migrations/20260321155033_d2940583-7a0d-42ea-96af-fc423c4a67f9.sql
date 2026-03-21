
-- Add hood and erkennungsmerkmale columns to gangs
ALTER TABLE public.gangs ADD COLUMN IF NOT EXISTS hood text;
ALTER TABLE public.gangs ADD COLUMN IF NOT EXISTS erkennungsmerkmale text;

-- Add unit-based license limits
INSERT INTO public.team_license_limits (team, max_licenses) VALUES
  ('Police Academy', 0),
  ('Justice Division', 0),
  ('Public Relation', 0),
  ('SWAT', 0),
  ('IAD', 0),
  ('NCD', 0),
  ('Highway Patrol', 0),
  ('Air Support Division', 0)
ON CONFLICT DO NOTHING;
