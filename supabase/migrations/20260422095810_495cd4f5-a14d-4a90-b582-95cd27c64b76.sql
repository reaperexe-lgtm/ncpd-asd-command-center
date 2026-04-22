CREATE POLICY "Applicants can view own exam submissions"
ON public.theory_exam_results
FOR SELECT
TO authenticated
USING (
  dienstnummer = (SELECT dienstnummer FROM public.profiles WHERE id = auth.uid())
);