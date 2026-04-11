CREATE POLICY "Anon can view own exam by id"
ON public.theory_exam_results
FOR SELECT
TO anon
USING (true);