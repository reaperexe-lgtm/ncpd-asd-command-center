CREATE POLICY "Applicants can view own practical exams"
ON public.practical_exam_results
FOR SELECT
TO authenticated
USING (
  candidate_dienstnummer = (
    SELECT dienstnummer FROM public.profiles WHERE id = auth.uid()
  )
);