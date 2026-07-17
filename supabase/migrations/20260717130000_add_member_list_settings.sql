-- Settings für die Discord-Mitgliederliste (Edge Function
-- discord-send-member-list). channel_id ist vorbelegt mit dem gewünschten
-- Ziel-Channel; message_id wird beim ersten Senden automatisch befüllt und
-- danach für Edit-in-place genutzt (die Liste wird nicht jedes Mal neu
-- gepostet, sondern aktualisiert).

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'member_list_channel_id', '1354479009714405568'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'member_list_channel_id');

INSERT INTO public.permission_settings (permission_key, role)
SELECT 'member_list_message_id', ''
WHERE NOT EXISTS (SELECT 1 FROM public.permission_settings WHERE permission_key = 'member_list_message_id');
