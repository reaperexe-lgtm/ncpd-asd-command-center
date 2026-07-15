CREATE TABLE public.heli_data_embeds (
  id text PRIMARY KEY,
  channel_id text NOT NULL,
  embed_json jsonb NOT NULL,
  discord_message_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.heli_data_embeds TO authenticated;
GRANT ALL ON public.heli_data_embeds TO service_role;

ALTER TABLE public.heli_data_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view heli embeds" ON public.heli_data_embeds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'co_director'));

CREATE POLICY "Admins can manage heli embeds" ON public.heli_data_embeds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'co_director'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'co_director'));

CREATE TRIGGER heli_data_embeds_updated_at
  BEFORE UPDATE ON public.heli_data_embeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.heli_data_embeds (id, channel_id, embed_json) VALUES
('jcon-1', '1421880750902476871', '{"title":"Police Department Helikopter Daten [JCON]","color":2278750,"fields":[{"name":"Top Speed","value":"300 km/h"},{"name":"Besatzung","value":"1 × Pilot\n1 × Pistol-Gunner\n1 × Left-Gunner\n1 × Right-Gunner"},{"name":"Überlebensfähigkeit","value":"Hält leichten Beschuss und kleinere Unfallschäden aus"},{"name":"Panzerung","value":"Keine Vollpanzerung, Türen zum Schutz für Left-/Right-Gunner"},{"name":"Rolle im Einsatz","value":"Vielseitig einsetzbar: Aufklärung, Feuerunterstützung, Personen Transportaufgaben"}]}'::jsonb),
('jcon-2', '1421880750902476871', '{"title":"Police Department Helikopter Daten [JCON]","color":2278750,"fields":[{"name":"Top Speed","value":"300 km/h"},{"name":"Besatzung","value":"1 × Pilot\n1 × Pistol-Gunner\n1 × Left-Gunner\n1 × Right-Gunner"},{"name":"Überlebensfähigkeit","value":"Hält leichten Beschuss und kleinere Unfallschäden aus"},{"name":"Panzerung","value":"Keine Vollpanzerung, Türen zum Schutz für Left-/Right-Gunner"},{"name":"Rolle im Einsatz","value":"Vielseitig einsetzbar: Aufklärung, Feuerunterstützung, Personen Transportaufgaben"}]}'::jsonb),
('maverick-1', '1421880750902476871', '{"title":"Police Department Helikopter Daten [Maverick]","color":2278750,"fields":[{"name":"Top Speed","value":"320 km/h"},{"name":"Besatzung","value":"1 × Pilot\n1 × Pistol-Gunner\n1 × Left-Gunner\n1 × Right-Gunner"},{"name":"Überlebensfähigkeit","value":"Hält mittleren Beschuss und mittlere Unfallschäden aus"},{"name":"Panzerung","value":"Mittlere Panzerung"},{"name":"Rolle im Einsatz","value":"Vielseitig einsetzbar: Highspeed-Verfolgungen, Feuerunterstützung, Personen Transportaufgaben"}]}'::jsonb);
