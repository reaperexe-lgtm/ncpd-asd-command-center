DELETE FROM public.heli_data_embeds WHERE id = 'maverick-alt-1';

UPDATE public.heli_data_embeds
SET embed_json = jsonb_set(embed_json, '{image,url}', '"https://ostuzusncwkmfwzuhhmc.supabase.co/storage/v1/object/public/assets/heli-embeds/jcon.png"'::jsonb, true)
WHERE id = 'jcon-1';

UPDATE public.heli_data_embeds
SET embed_json = jsonb_set(embed_json, '{image,url}', '"https://ostuzusncwkmfwzuhhmc.supabase.co/storage/v1/object/public/assets/heli-embeds/maverick.png"'::jsonb, true)
WHERE id = 'maverick-1';