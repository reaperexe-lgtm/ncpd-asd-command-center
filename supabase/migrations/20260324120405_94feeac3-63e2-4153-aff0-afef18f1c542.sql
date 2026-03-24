CREATE TABLE public.stats_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_type text NOT NULL,
  reset_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stats_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage resets" ON public.stats_resets FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Approved can view resets" ON public.stats_resets FOR SELECT TO authenticated USING (is_approved(auth.uid()));