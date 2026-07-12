INSERT INTO public.achievement_definitions (
  code,
  title,
  description,
  icon,
  tier,
  category,
  threshold,
  metric,
  sort_order,
  is_active
)
VALUES (
  'crew_participations_200',
  'Heli-Teilnehmer',
  '200 Heli-Beteiligungen erreicht',
  'Plane',
  'diamond',
  'missions',
  200,
  'crew_participations_total',
  260,
  true
)
ON CONFLICT (code) DO NOTHING;
