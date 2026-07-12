-- "10-80-Sammler" und "Missionen-Master" waren fälschlicherweise als Wochen-Challenges
-- gelistet, obwohl es Lifetime-Metriken sind (kein Wochen-Reset). Sie werden hier als
-- Achievements geführt, mit der ursprünglichen Belohnung von 1.000.000 $.

INSERT INTO public.achievement_definitions (
  code, title, description, icon, tier, category, threshold, metric, sort_order, is_active
)
VALUES
  (
    'pursuits_total_100_sammler',
    '10-80-Sammler',
    '100 Verfolgungen insgesamt erreicht',
    'Car',
    'diamond',
    'pursuits',
    100,
    'pursuits_total',
    270,
    true
  ),
  (
    'missions_total_100_master',
    'Missionen-Master',
    '100 Einsätze insgesamt erreicht',
    'Target',
    'diamond',
    'missions',
    100,
    'missions_total',
    280,
    true
  )
ON CONFLICT (code) DO NOTHING;

-- Alte, jetzt nicht mehr generierte Wochen-Challenge-Zeilen mit diesen Titeln aufräumen,
-- damit sie nicht als "aktive" Challenge stehen bleiben.
DELETE FROM public.weekly_challenges
WHERE title IN ('10-80-Sammler', 'Missionen-Master');
