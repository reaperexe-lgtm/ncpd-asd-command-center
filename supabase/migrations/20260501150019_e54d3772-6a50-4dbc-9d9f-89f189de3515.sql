
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_sr_training boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.sr_training_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sr_training_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own SR signup"
  ON public.sr_training_signups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_approved(auth.uid()));

CREATE POLICY "Users view own SR signup"
  ON public.sr_training_signups FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trainers view all SR signups"
  ON public.sr_training_signups FOR SELECT TO authenticated
  USING (can_review_exams(auth.uid()));

CREATE POLICY "Trainers update SR signups"
  ON public.sr_training_signups FOR UPDATE TO authenticated
  USING (can_review_exams(auth.uid()))
  WITH CHECK (can_review_exams(auth.uid()));

CREATE POLICY "Admins delete SR signups"
  ON public.sr_training_signups FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER sr_training_signups_updated_at
  BEFORE UPDATE ON public.sr_training_signups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
