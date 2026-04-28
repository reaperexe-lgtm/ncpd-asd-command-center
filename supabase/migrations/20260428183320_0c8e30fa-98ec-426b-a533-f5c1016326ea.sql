INSERT INTO public.permission_settings (permission_key, role)
SELECT 'discord_invite_description', ''
WHERE NOT EXISTS (
  SELECT 1 FROM public.permission_settings WHERE permission_key = 'discord_invite_description'
);