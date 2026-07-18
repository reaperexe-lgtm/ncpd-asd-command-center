-- =========================================
-- Fix: Direction-Pings wurden als "erledigt" markiert, obwohl der
-- Discord-Versand nie bestätigt zurückkam (discord-notify gab bisher immer
-- HTTP 200 + success:true zurück, auch wenn ALLE DM/Fallback-Versuche
-- fehlschlugen). Dadurch wurden reward_paid / user_achievements dauerhaft
-- als "gemeldet" markiert, ohne dass die Direction je etwas bekommen hat —
-- und die Idempotenz-Prüfung ("schon vergeben? -> skip") hat jeden Retry
-- verhindert.
--
-- Diese Migration führt eine Locking-/Retry-Spalte ein, damit Auszahlung
-- (reward_paid / Achievement-Eintrag) und "Direction wurde tatsächlich
-- benachrichtigt" getrennt getrackt werden. Erst wenn discord-notify eine
-- bestätigte Zustellung zurückmeldet, wird als versendet markiert.
-- =========================================

ALTER TABLE public.challenge_completions
  ADD COLUMN IF NOT EXISTS notify_attempted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS direction_notified_at TIMESTAMPTZ NULL;

ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS notify_attempted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS direction_notified_at TIMESTAMPTZ NULL;

-- Rückwirkend: alle aktuell "reward_paid = true" markierten Wochenziele
-- dieser Kalenderwoche, deren Direction-Ping nie bestätigt wurde, für einen
-- Retry freigeben. Betrifft nur die beiden Cash-Challenges (Einsatz-Sprint /
-- Verfolgungs-Marathon) - Casino-Belohnungen sind bereits real gutgeschrieben
-- und werden hier NICHT angefasst, um keine doppelte Auszahlung zu riskieren.
UPDATE public.challenge_completions cc
SET reward_paid = false, notify_attempted_at = NULL
FROM public.weekly_challenges wc
WHERE cc.challenge_id = wc.id
  AND wc.title IN ('Einsatz-Sprint', 'Verfolgungs-Marathon')
  AND cc.reward_paid = true
  AND cc.direction_notified_at IS NULL;

-- Gleiches für Achievement-Pings (missions_week_5 / pursuits_week_10): das
-- Achievement selbst (und eine bereits erfolgte Casino-Gutschrift, sofern
-- vorhanden) bleibt bestehen, nur die "Direction wurde informiert"-Markierung
-- wird zum Retry freigegeben.
UPDATE public.user_achievements
SET notify_attempted_at = NULL
WHERE achievement_code IN ('missions_week_5', 'pursuits_week_10')
  AND direction_notified_at IS NULL;
