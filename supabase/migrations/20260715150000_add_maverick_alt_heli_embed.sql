-- Entfernt die versehentliche Dublette (jcon-2 war identisch zu jcon-1)
DELETE FROM public.heli_data_embeds WHERE id = 'jcon-2';

-- Fügt ein leeres "image"-Feld zu den bestehenden Embeds hinzu, damit die Bilder
-- später einfach über die Admin-Oberfläche (URL eintragen) ergänzt werden können.
UPDATE public.heli_data_embeds
SET embed_json = jsonb_set(embed_json, '{image}', '{"url": ""}'::jsonb, true)
WHERE id IN ('jcon-1', 'maverick-1');

