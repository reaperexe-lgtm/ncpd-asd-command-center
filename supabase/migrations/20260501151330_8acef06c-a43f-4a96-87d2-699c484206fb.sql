-- SR theory exam results
CREATE TABLE public.sr_theory_exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sr_theory_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own SR theory results"
  ON public.sr_theory_exam_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own SR theory results"
  ON public.sr_theory_exam_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Trainers view all SR theory results"
  ON public.sr_theory_exam_results FOR SELECT TO authenticated
  USING (can_review_exams(auth.uid()));

CREATE POLICY "Admins delete SR theory results"
  ON public.sr_theory_exam_results FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX idx_sr_theory_user ON public.sr_theory_exam_results(user_id, created_at DESC);