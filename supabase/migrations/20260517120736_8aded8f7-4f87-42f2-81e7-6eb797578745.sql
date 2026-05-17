INSERT INTO public.achievement_definitions (code, title, description, icon, tier, category, threshold, metric, sort_order, is_active)
VALUES ('missions_week_5', 'Einsatz-Sturm', '5 Einsätze in einer Woche geschafft', 'Flame', 'silver', 'missions', 5, 'missions_week', 175, true)
ON CONFLICT (code) DO NOTHING;