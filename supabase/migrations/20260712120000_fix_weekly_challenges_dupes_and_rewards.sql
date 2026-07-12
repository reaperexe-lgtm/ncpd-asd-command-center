-- =========================================
-- Fix: doppelte Wochen-Challenges + neue Belohnungslogik
-- =========================================

-- 1) Für jede (week_start, title)-Gruppe mit Duplikaten: die älteste Zeile behalten,
--    alle challenge_completions der Duplikate auf die überlebende Zeile ummappen,
--    danach die Duplikate löschen.
DO $$
DECLARE
  grp RECORD;
  survivor UUID;
  dup UUID;
BEGIN
  FOR grp IN
    SELECT week_start, title
    FROM public.weekly_challenges
    GROUP BY week_start, title
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO survivor
    FROM public.weekly_challenges
    WHERE week_start = grp.week_start AND title = grp.title
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    FOR dup IN
      SELECT id FROM public.weekly_challenges
      WHERE week_start = grp.week_start AND title = grp.title AND id <> survivor
    LOOP
      -- Completions der Duplikat-Challenge auf die überlebende Challenge ummappen,
      -- ohne den UNIQUE(challenge_id, user_id) Constraint zu verletzen.
      UPDATE public.challenge_completions cc
      SET challenge_id = survivor
      WHERE cc.challenge_id = dup
        AND NOT EXISTS (
          SELECT 1 FROM public.challenge_completions cc2
          WHERE cc2.challenge_id = survivor AND cc2.user_id = cc.user_id
        );

      -- Restliche (jetzt überflüssige) Completions des Duplikats entfernen.
      DELETE FROM public.challenge_completions WHERE challenge_id = dup;

      -- Duplikat-Challenge selbst löschen.
      DELETE FROM public.weekly_challenges WHERE id = dup;
    END LOOP;
  END LOOP;
END $$;

-- 2) Unique Constraint, damit pro Woche jeder Challenge-Titel nur 1x existieren kann.
--    Verhindert künftige Race-Condition-Duplikate beim gleichzeitigen Seeding.
ALTER TABLE public.weekly_challenges
  ADD CONSTRAINT weekly_challenges_week_title_unique UNIQUE (week_start, title);

-- 3) Neue Belohnungsbeträge:
--    Einsatz-Sprint & Verfolgungs-Marathon: je 50.000$ Ingame-Geld (Auszahlung durch Direction)
--    10-80-Sammler & Missionen-Master: je 1.000.000$ direkt aufs Gambling-Konto
UPDATE public.weekly_challenges SET reward_amount = 50000    WHERE title = 'Einsatz-Sprint';
UPDATE public.weekly_challenges SET reward_amount = 50000    WHERE title = 'Verfolgungs-Marathon';
UPDATE public.weekly_challenges SET reward_amount = 1000000  WHERE title = '10-80-Sammler';
UPDATE public.weekly_challenges SET reward_amount = 1000000  WHERE title = 'Missionen-Master';
