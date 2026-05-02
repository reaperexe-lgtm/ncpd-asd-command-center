CREATE TABLE public.practical_exam_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type text NOT NULL CHECK (exam_type IN ('ASD1','ASD2')),
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practical_exam_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view exam images"
ON public.practical_exam_images FOR SELECT TO authenticated
USING (is_approved(auth.uid()) OR has_role(auth.uid(),'asd_applicant') OR has_role(auth.uid(),'flight_applicant'));

CREATE POLICY "Trainers can insert exam images"
ON public.practical_exam_images FOR INSERT TO authenticated
WITH CHECK (can_review_exams(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Trainers can update exam images"
ON public.practical_exam_images FOR UPDATE TO authenticated
USING (can_review_exams(auth.uid())) WITH CHECK (can_review_exams(auth.uid()));

CREATE POLICY "Trainers can delete exam images"
ON public.practical_exam_images FOR DELETE TO authenticated
USING (can_review_exams(auth.uid()));

CREATE INDEX idx_practical_exam_images_type_order ON public.practical_exam_images(exam_type, sort_order);