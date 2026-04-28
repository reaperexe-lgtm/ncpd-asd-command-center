-- Übungen (Trainings/Exercises) System
CREATE TABLE public.uebungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  beschreibung TEXT,
  ort TEXT,
  kategorie TEXT NOT NULL DEFAULT 'Sonstiges',
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_teilnehmer INTEGER,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'geplant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.uebungen ENABLE ROW LEVEL SECURITY;

-- Approved sehen alle Übungen
CREATE POLICY "Approved can view uebungen"
ON public.uebungen FOR SELECT
TO authenticated
USING (is_approved(auth.uid()));

-- Nur Ausbilder & Direktion erstellen (can_review_exams deckt: ausbilder, trial_ausbilder, supervisor, director, co_director, admin)
CREATE POLICY "Trainers can create uebungen"
ON public.uebungen FOR INSERT
TO authenticated
WITH CHECK (can_review_exams(auth.uid()) AND created_by = auth.uid());

-- Ersteller oder Admin kann updaten
CREATE POLICY "Creator or admin can update uebungen"
ON public.uebungen FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- Ersteller oder Admin kann löschen
CREATE POLICY "Creator or admin can delete uebungen"
ON public.uebungen FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE TRIGGER uebungen_updated_at
BEFORE UPDATE ON public.uebungen
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Teilnahmen (RSVP)
CREATE TABLE public.uebung_teilnahmen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uebung_id UUID NOT NULL REFERENCES public.uebungen(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'zusage',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (uebung_id, user_id)
);

ALTER TABLE public.uebung_teilnahmen ENABLE ROW LEVEL SECURITY;

-- Approved sehen alle Teilnahmen
CREATE POLICY "Approved can view teilnahmen"
ON public.uebung_teilnahmen FOR SELECT
TO authenticated
USING (is_approved(auth.uid()));

-- Approved können eigene Teilnahme anlegen
CREATE POLICY "Approved can insert own teilnahme"
ON public.uebung_teilnahmen FOR INSERT
TO authenticated
WITH CHECK (is_approved(auth.uid()) AND user_id = auth.uid());

-- Eigene Teilnahme updaten
CREATE POLICY "Users update own teilnahme"
ON public.uebung_teilnahmen FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Eigene Teilnahme löschen oder Ersteller/Admin
CREATE POLICY "Users delete own teilnahme"
ON public.uebung_teilnahmen FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.uebungen u WHERE u.id = uebung_id AND u.created_by = auth.uid())
);

CREATE TRIGGER uebung_teilnahmen_updated_at
BEFORE UPDATE ON public.uebung_teilnahmen
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.uebungen;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uebung_teilnahmen;