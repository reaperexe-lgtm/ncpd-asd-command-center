INSERT INTO public.permission_settings (permission_key, role, allowed) VALUES
  ('stats_ping_director_id', '', true),
  ('stats_ping_codirector_id', '', true)
ON CONFLICT DO NOTHING;