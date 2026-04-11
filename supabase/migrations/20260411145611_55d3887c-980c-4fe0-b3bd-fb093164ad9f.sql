
-- Create table for manageable exam questions
CREATE TABLE public.theory_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  type text NOT NULL DEFAULT 'short',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.theory_exam_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions (exam is public)
CREATE POLICY "Anyone can view questions"
  ON public.theory_exam_questions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins/directors/supervisors can manage questions
CREATE POLICY "Admins can manage questions"
  ON public.theory_exam_questions FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

-- Seed the existing 7 questions
INSERT INTO public.theory_exam_questions (question, points, type, sort_order) VALUES
  ('Was bedeutet die Abkürzung OW?', 1, 'short', 1),
  ('Nenne 3 Aufgabengebiete der A.S.D und erkläre in 1-2 Sätzen.', 3, 'long', 2),
  ('Nenne 2 der 3 Funktionen unserer Kamera.', 2, 'short', 3),
  ('Nenne die wichtigste Regel beim benutzen einer Seilwinde.', 1, 'short', 4),
  ('Nenne 3 Aufgabenbereiche des Co.-Piloten.', 3, 'short', 5),
  ('Nenne und erläutere die beiden Funkcodes, welche für eine OW wichtig sind.', 2, 'long', 6),
  ('Nenne die Bedeutung jeder Farbe (Rot, Gelb, Grün) im Einsatzgebiet.', 3, 'long', 7);

-- Enable realtime for theory_exam_results
ALTER PUBLICATION supabase_realtime ADD TABLE public.theory_exam_results;
