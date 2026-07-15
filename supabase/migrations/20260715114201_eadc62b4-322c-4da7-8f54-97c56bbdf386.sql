DELETE FROM public.heli_data_embeds WHERE id = 'jcon-2';

UPDATE public.heli_data_embeds
SET embed_json = jsonb_set(embed_json, '{image}', '{"url": ""}'::jsonb, true)
WHERE id IN ('jcon-1', 'maverick-1');

INSERT INTO public.heli_data_embeds (id, channel_id, embed_json) VALUES
('maverick-alt-1', '1421880750902476871', '{
  "title": "Police Department Helikopter Daten [Maverick Alt]",
  "color": 2278750,
  "fields": [
    {"name": "Top Speed", "value": "250 km/h"},
    {"name": "Besatzung", "value": "1 × Pilot\n1 × Pistol-Gunner\n1 × Left-Gunner\n1 × Right-Gunner"},
    {"name": "Überlebensfähigkeit", "value": "Hält mittleren Beschuss und mittlere Unfallschäden aus"},
    {"name": "Panzerung", "value": "Mittlere Panzerung"},
    {"name": "Rolle im Einsatz", "value": "Vielseitig einsetzbar: Aufklärung, Feuerunterstützung, Personen Transportaufgaben"}
  ],
  "image": {"url": ""}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;