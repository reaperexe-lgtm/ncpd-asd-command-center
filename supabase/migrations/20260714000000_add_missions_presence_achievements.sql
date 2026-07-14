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
  is_active,
  base_code,
  tier_level,
  reward_amount
)
VALUES
  ('missions_presence_10', 'Einsatz-Teilnehmer', '10 Einsätze als Beteiligter erreicht', 'Award', 'bronze', 'missions', 10, 'crew_participations_total', 291, true, 'missions_presence', 1, 100000),
  ('missions_presence_50', 'Einsatz-Geselle', '50 Einsätze als Beteiligter erreicht', 'Award', 'silver', 'missions', 50, 'crew_participations_total', 292, true, 'missions_presence', 2, 250000),
  ('missions_presence_150', 'Einsatz-Experte', '150 Einsätze als Beteiligter erreicht', 'Award', 'gold', 'missions', 150, 'crew_participations_total', 293, true, 'missions_presence', 3, 500000),
  ('missions_presence_200', 'Einsatz-Spezialist', '200 Einsätze als Beteiligter erreicht', 'Award', 'platinum', 'missions', 200, 'crew_participations_total', 294, true, 'missions_presence', 4, 750000),
  ('missions_presence_300', 'Einsatz-Champion', '300 Einsätze als Beteiligter erreicht', 'Award', 'diamond', 'missions', 300, 'crew_participations_total', 295, true, 'missions_presence', 5, 1000000),
  ('missions_presence_400', 'Einsatz-Elite', '400 Einsätze als Beteiligter erreicht', 'Award', 'emerald', 'missions', 400, 'crew_participations_total', 296, true, 'missions_presence', 6, 1250000),
  ('missions_presence_500', 'Einsatz-Meister', '500 Einsätze als Beteiligter erreicht', 'Award', 'ruby', 'missions', 500, 'crew_participations_total', 297, true, 'missions_presence', 7, 1500000),
  ('missions_presence_1000', 'Einsatz-Master', '1000 Einsätze als Beteiligter erreicht', 'Award', 'obsidian', 'missions', 1000, 'crew_participations_total', 298, true, 'missions_presence', 8, 2650000)
ON CONFLICT (code) DO NOTHING;
