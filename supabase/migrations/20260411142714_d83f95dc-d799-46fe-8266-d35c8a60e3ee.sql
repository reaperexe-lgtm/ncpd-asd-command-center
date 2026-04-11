
CREATE TABLE public.theory_exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  dienstnummer TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.theory_exam_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_review_exams(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director', 'co_director', 'admin', 'supervisor', 'ausbilder', 'trial_ausbilder')
  )
$$;

-- Anyone can insert (unauthenticated, since this is on the auth page)
CREATE POLICY "Anyone can submit exam" ON public.theory_exam_results
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authorized roles can view all results
CREATE POLICY "Authorized can view exam results" ON public.theory_exam_results
  FOR SELECT TO authenticated
  USING (can_review_exams(auth.uid()));

-- Authorized roles can update results (for scoring)
CREATE POLICY "Authorized can update exam results" ON public.theory_exam_results
  FOR UPDATE TO authenticated
  USING (can_review_exams(auth.uid()));

-- Admins can delete exam results
CREATE POLICY "Admins can delete exam results" ON public.theory_exam_results
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));
