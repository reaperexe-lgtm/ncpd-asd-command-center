
CREATE TABLE public.practical_exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  candidate_dienstnummer TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'ASD1',
  checked_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  himmelsrichtung_deduction INTEGER NOT NULL DEFAULT 0,
  uturn_deduction INTEGER NOT NULL DEFAULT 0,
  ten33_deduction INTEGER NOT NULL DEFAULT 0,
  location_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 35,
  status TEXT NOT NULL DEFAULT 'submitted',
  examiner_id UUID NOT NULL,
  examiner_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.practical_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ausbilder can view practical exams"
  ON public.practical_exam_results FOR SELECT
  TO authenticated
  USING (can_review_exams(auth.uid()));

CREATE POLICY "Ausbilder can create practical exams"
  ON public.practical_exam_results FOR INSERT
  TO authenticated
  WITH CHECK (can_review_exams(auth.uid()) AND examiner_id = auth.uid());

CREATE POLICY "Ausbilder can update practical exams"
  ON public.practical_exam_results FOR UPDATE
  TO authenticated
  USING (can_review_exams(auth.uid()));

CREATE POLICY "Admins can delete practical exams"
  ON public.practical_exam_results FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
