-- =========================================
-- 1) Revert: "Heli-Teilnehmer" (crew_participations_200) wieder entfernen
--    (war Migration 20260712120000_add_heli_participation_achievement.sql,
--     wird hiermit vollständig zurückgenommen).
-- =========================================
DELETE FROM public.user_achievements WHERE achievement_code = 'crew_participations_200';
DELETE FROM public.achievement_definitions WHERE code = 'crew_participations_200';

-- =========================================
-- 2) "10-80-Sammler" und "Missionen-Master" waren bisher einzelne Achievements
--    (Schwelle 100, Fix-Belohnung 1.000.000 $). Werden jetzt in 8 Stufen mit
--    eigenen Namen und aufsteigender Belohnung aufgeteilt (Ø 1.000.000 $/Stufe).
--    Alte Einträge + bereits vergebene User-Achievements dazu entfernen, die
--    normale Selbstheilung/award-achievements-Logik vergibt die neuen Stufen
--    dann automatisch anhand der echten Zähler neu.
-- =========================================
DELETE FROM public.user_achievements
WHERE achievement_code IN ('pursuits_total_100_sammler', 'missions_total_100_master');

DELETE FROM public.achievement_definitions
WHERE code IN ('pursuits_total_100_sammler', 'missions_total_100_master');

-- Spalte für individuelle Stufen-Belohnung (überschreibt die generische
-- Tier-Belohnung aus TIER_REWARDS in der award-achievements Edge Function).
ALTER TABLE public.achievement_definitions
  ADD COLUMN IF NOT EXISTS reward_amount INTEGER;

INSERT INTO public.achievement_definitions
  (code, title, description, icon, tier, category, threshold, metric, sort_order, is_active, base_code, tier_level, reward_amount)
VALUES
  -- "10-80-Sammler" Familie (Verfolgungen insgesamt)
  ('pursuits_sammler_10',   '10-80-Lehrling',     '10 Verfolgungen insgesamt erreicht',    'Car', 'bronze',   'pursuits', 10,   'pursuits_total', 271, true, 'pursuits_sammler', 1, 100000),
  ('pursuits_sammler_50',   '10-80-Geselle',      '50 Verfolgungen insgesamt erreicht',    'Car', 'silver',   'pursuits', 50,   'pursuits_total', 272, true, 'pursuits_sammler', 2, 250000),
  ('pursuits_sammler_150',  '10-80-Experte',      '150 Verfolgungen insgesamt erreicht',   'Car', 'gold',     'pursuits', 150,  'pursuits_total', 273, true, 'pursuits_sammler', 3, 500000),
  ('pursuits_sammler_200',  '10-80-Spezialist',   '200 Verfolgungen insgesamt erreicht',   'Car', 'platinum', 'pursuits', 200,  'pursuits_total', 274, true, 'pursuits_sammler', 4, 750000),
  ('pursuits_sammler_300',  '10-80-Champion',     '300 Verfolgungen insgesamt erreicht',   'Car', 'diamond',  'pursuits', 300,  'pursuits_total', 275, true, 'pursuits_sammler', 5, 1000000),
  ('pursuits_sammler_400',  '10-80-Elite',        '400 Verfolgungen insgesamt erreicht',   'Car', 'emerald',  'pursuits', 400,  'pursuits_total', 276, true, 'pursuits_sammler', 6, 1250000),
  ('pursuits_sammler_500',  '10-80-Meister',      '500 Verfolgungen insgesamt erreicht',   'Car', 'ruby',     'pursuits', 500,  'pursuits_total', 277, true, 'pursuits_sammler', 7, 1500000),
  ('pursuits_sammler_1000', '10-80-Sammler',      '1000 Verfolgungen insgesamt erreicht',  'Car', 'obsidian', 'pursuits', 1000, 'pursuits_total', 278, true, 'pursuits_sammler', 8, 2650000),

  -- "Missionen-Master" Familie (Einsätze insgesamt)
  ('missions_master_10',    'Missionen-Lehrling', '10 Einsätze insgesamt erreicht',    'Target', 'bronze',   'missions', 10,   'missions_total', 281, true, 'missions_master', 1, 100000),
  ('missions_master_50',    'Missionen-Geselle',  '50 Einsätze insgesamt erreicht',    'Target', 'silver',   'missions', 50,   'missions_total', 282, true, 'missions_master', 2, 250000),
  ('missions_master_150',   'Missionen-Experte',  '150 Einsätze insgesamt erreicht',   'Target', 'gold',     'missions', 150,  'missions_total', 283, true, 'missions_master', 3, 500000),
  ('missions_master_200',   'Missionen-Spezialist','200 Einsätze insgesamt erreicht',  'Target', 'platinum', 'missions', 200,  'missions_total', 284, true, 'missions_master', 4, 750000),
  ('missions_master_300',   'Missionen-Champion', '300 Einsätze insgesamt erreicht',   'Target', 'diamond',  'missions', 300,  'missions_total', 285, true, 'missions_master', 5, 1000000),
  ('missions_master_400',   'Missionen-Elite',    '400 Einsätze insgesamt erreicht',   'Target', 'emerald',  'missions', 400,  'missions_total', 286, true, 'missions_master', 6, 1250000),
  ('missions_master_500',   'Missionen-Meister',  '500 Einsätze insgesamt erreicht',   'Target', 'ruby',     'missions', 500,  'missions_total', 287, true, 'missions_master', 7, 1500000),
  ('missions_master_1000',  'Missionen-Master',   '1000 Einsätze insgesamt erreicht',  'Target', 'obsidian', 'missions', 1000, 'missions_total', 288, true, 'missions_master', 8, 2650000)
ON CONFLICT (code) DO NOTHING;
