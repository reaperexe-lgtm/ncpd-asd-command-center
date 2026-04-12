
-- Create configurable ASD training modules table
CREATE TABLE public.asd_training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Allgemein',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asd_training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage asd modules"
ON public.asd_training_modules FOR ALL
TO authenticated
USING (can_review_exams(auth.uid()))
WITH CHECK (can_review_exams(auth.uid()));

CREATE POLICY "Approved and applicants can view asd modules"
ON public.asd_training_modules FOR SELECT
TO authenticated
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'asd_applicant'::app_role));

CREATE TRIGGER update_asd_training_modules_updated_at
BEFORE UPDATE ON public.asd_training_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create applicant progress tracking table
CREATE TABLE public.asd_applicant_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.asd_training_modules(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(applicant_id, module_id)
);

ALTER TABLE public.asd_applicant_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage all progress"
ON public.asd_applicant_progress FOR ALL
TO authenticated
USING (can_review_exams(auth.uid()))
WITH CHECK (can_review_exams(auth.uid()));

CREATE POLICY "Applicants can view own progress"
ON public.asd_applicant_progress FOR SELECT
TO authenticated
USING (applicant_id = auth.uid());

CREATE TRIGGER update_asd_applicant_progress_updated_at
BEFORE UPDATE ON public.asd_applicant_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
