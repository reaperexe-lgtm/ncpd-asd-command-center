
CREATE TABLE IF NOT EXISTS public.sr_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_code text NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  note text,
  completed_by uuid,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_code)
);

ALTER TABLE public.sr_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own SR progress"
  ON public.sr_training_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trainers view all SR progress"
  ON public.sr_training_progress FOR SELECT TO authenticated
  USING (can_review_exams(auth.uid()));

CREATE POLICY "Trainers manage SR progress"
  ON public.sr_training_progress FOR INSERT TO authenticated
  WITH CHECK (can_review_exams(auth.uid()));

CREATE POLICY "Trainers update SR progress"
  ON public.sr_training_progress FOR UPDATE TO authenticated
  USING (can_review_exams(auth.uid()))
  WITH CHECK (can_review_exams(auth.uid()));

CREATE POLICY "Trainers delete SR progress"
  ON public.sr_training_progress FOR DELETE TO authenticated
  USING (can_review_exams(auth.uid()));

CREATE TRIGGER sr_training_progress_updated_at
  BEFORE UPDATE ON public.sr_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
