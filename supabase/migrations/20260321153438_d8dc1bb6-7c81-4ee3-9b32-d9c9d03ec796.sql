-- Table to store max flight license slots per team
CREATE TABLE public.team_license_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team text NOT NULL UNIQUE,
  max_licenses integer NOT NULL DEFAULT 0
);

ALTER TABLE public.team_license_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone approved can view limits"
ON public.team_license_limits FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Admins can manage limits"
ON public.team_license_limits FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- Seed default teams with 0 limit
INSERT INTO public.team_license_limits (team, max_licenses) VALUES
  ('Police Academy', 0),
  ('Justice Division', 0),
  ('Public Relations', 0),
  ('S.W.A.T', 0),
  ('I.A.D', 0),
  ('NCD', 0),
  ('Highway Patrol', 0),
  ('Air Support Division', 0);