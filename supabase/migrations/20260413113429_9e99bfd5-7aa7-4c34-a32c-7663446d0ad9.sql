
-- Formation protocols table
CREATE TABLE public.formation_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  untertitel TEXT,
  datum TEXT NOT NULL,
  uhrzeit TEXT NOT NULL,
  protokollfuehrer TEXT NOT NULL,
  ort TEXT NOT NULL DEFAULT 'Dach Police Department',
  sections JSONB DEFAULT '[]'::jsonb,
  attendance JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.formation_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read formation protocols"
ON public.formation_protocols FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()));

CREATE POLICY "Authenticated users can create formation protocols"
ON public.formation_protocols FOR INSERT TO authenticated
WITH CHECK (public.is_approved(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Admins can delete formation protocols"
ON public.formation_protocols FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Changelogs table
CREATE TABLE public.changelogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.changelogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read changelogs"
ON public.changelogs FOR SELECT USING (true);

CREATE POLICY "Admins can manage changelogs"
ON public.changelogs FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert initial changelog entries
INSERT INTO public.changelogs (version, title, description, changes) VALUES
('1.0.0', 'Initiales Release', 'Grundlegende Funktionen der ASD-Plattform', '["Mitgliederverwaltung", "Einsatz-Protokolle", "Verfolgungs-Protokolle", "Statistiken", "Rollenbasierte Zugriffskontrolle"]'::jsonb),
('1.1.0', 'Fluglizenzen & Theorieprüfung', 'Neues Fluglizenzen-System und Theorieprüfungen', '["Fluglizenzen-Verwaltung", "Theorieprüfung für Fluglizenzen", "Urkundengenerierung", "Praktische Prüfung"]'::jsonb),
('1.2.0', 'ASD-Bewerber System', 'Ausbildungsmodule für ASD-Bewerber', '["ASD-Bewerber Registrierung", "Ausbildungsmodule & Fortschritt", "Bewerber-Dashboard"]'::jsonb),
('1.3.0', 'Casino & Spiele', 'Unterhaltungsbereich mit Casino und FlappyPlane', '["Casino mit Spielen", "FlappyPlane Minigame", "Highscore-Tabelle"]'::jsonb),
('1.4.0', 'Aufstellungsprotokoll', 'Neues Aufstellungsprotokoll mit PDF-Export', '["Aufstellungsprotokoll erstellen", "Automatische Anwesenheitserkennung", "PDF-Download mit ASD-Branding", "Echtzeit-Präsenz-Tracking"]'::jsonb),
('1.5.0', 'Discord Integration', 'Discord-Bot-Commands für Statistiken', '["Top-Protokollschreiber Commands", "Automatischer Wochenreport", "Discord-Benachrichtigungen"]'::jsonb);
