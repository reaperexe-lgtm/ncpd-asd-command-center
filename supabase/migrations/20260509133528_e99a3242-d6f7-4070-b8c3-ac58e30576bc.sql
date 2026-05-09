WITH ranked_rewards AS (
  SELECT
    id,
    user_id,
    date_trunc('minute', week_start) AS normalized_week_start,
    row_number() OVER (
      PARTITION BY user_id, date_trunc('minute', week_start)
      ORDER BY paid_at ASC, id ASC
    ) AS rn
  FROM public.weekly_performance_rewards
)
DELETE FROM public.weekly_performance_rewards w
USING ranked_rewards r
WHERE w.id = r.id
  AND r.rn > 1;

ALTER TABLE public.weekly_performance_rewards
DROP CONSTRAINT IF EXISTS weekly_performance_rewards_user_id_week_start_key;

UPDATE public.weekly_performance_rewards
SET week_start = date_trunc('minute', week_start)
WHERE week_start <> date_trunc('minute', week_start);

ALTER TABLE public.weekly_performance_rewards
ADD CONSTRAINT weekly_performance_rewards_user_id_week_start_key
UNIQUE (user_id, week_start);