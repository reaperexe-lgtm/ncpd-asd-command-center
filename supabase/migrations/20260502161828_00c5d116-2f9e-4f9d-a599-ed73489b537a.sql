CREATE TABLE public.weekly_performance_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start timestamptz NOT NULL,
  missions_count integer NOT NULL DEFAULT 0,
  pursuits_count integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_performance_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view rewards"
ON public.weekly_performance_rewards FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Admins can manage rewards"
ON public.weekly_performance_rewards FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_weekly_perf_rewards_user_week ON public.weekly_performance_rewards (user_id, week_start);