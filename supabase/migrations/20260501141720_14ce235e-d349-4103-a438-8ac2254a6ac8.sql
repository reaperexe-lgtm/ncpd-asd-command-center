-- =========================================
-- Flashcards (Karteikarten) – eigene Karten zusätzlich zu Theorie-Fragen
-- =========================================
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Allgemein',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone approved or applicant can view flashcards"
ON public.flashcards FOR SELECT TO authenticated
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'asd_applicant') OR has_role(auth.uid(), 'flight_applicant'));

CREATE POLICY "Trainers can manage flashcards"
ON public.flashcards FOR ALL TO authenticated
USING (can_review_exams(auth.uid()))
WITH CHECK (can_review_exams(auth.uid()));

CREATE TRIGGER trg_flashcards_updated
BEFORE UPDATE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- Video Tutorials
-- =========================================
CREATE TABLE public.video_tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Allgemein',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone approved or applicant can view videos"
ON public.video_tutorials FOR SELECT TO authenticated
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'asd_applicant') OR has_role(auth.uid(), 'flight_applicant'));

CREATE POLICY "Trainers can manage videos"
ON public.video_tutorials FOR ALL TO authenticated
USING (can_review_exams(auth.uid()))
WITH CHECK (can_review_exams(auth.uid()));

CREATE TRIGGER trg_videos_updated
BEFORE UPDATE ON public.video_tutorials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- Achievements (Definitionen)
-- =========================================
CREATE TABLE public.achievement_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Trophy',
  tier TEXT NOT NULL DEFAULT 'bronze',
  category TEXT NOT NULL DEFAULT 'general',
  threshold INTEGER NOT NULL DEFAULT 1,
  metric TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone approved can view achievement defs"
ON public.achievement_definitions FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Admins manage achievement defs"
ON public.achievement_definitions FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =========================================
-- User Achievements (vergeben)
-- =========================================
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_code TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress_value INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, achievement_code)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view all user achievements"
ON public.user_achievements FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Users insert own achievements"
ON public.user_achievements FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins delete user achievements"
ON public.user_achievements FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- =========================================
-- Member of the Month (cached)
-- =========================================
CREATE TABLE public.member_of_month (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);
ALTER TABLE public.member_of_month ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved view MoM"
ON public.member_of_month FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Admins manage MoM"
ON public.member_of_month FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =========================================
-- Member milestones (Geburtstag / Jubiläum)
-- Wir nutzen profiles.created_at als ASD-Beitrittsdatum, optional ein eigenes Geburtstag-Feld
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS asd_join_date DATE;

-- =========================================
-- Weekly Challenges
-- =========================================
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  reward_amount INTEGER NOT NULL DEFAULT 50000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved view challenges"
ON public.weekly_challenges FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Admins manage challenges"
ON public.weekly_challenges FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.challenge_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved view completions"
ON public.challenge_completions FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

CREATE POLICY "Users insert own completions"
ON public.challenge_completions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users update own completions"
ON public.challenge_completions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins delete completions"
ON public.challenge_completions FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- =========================================
-- Seed Achievement Definitions
-- =========================================
INSERT INTO public.achievement_definitions (code, title, description, icon, tier, category, threshold, metric, sort_order) VALUES
('missions_10',  'Erster Einsatz-Profi', '10 Einsätze erfasst',  'Target',  'bronze', 'missions',   10,  'missions_total',  10),
('missions_50',  'Einsatz-Veteran',       '50 Einsätze erfasst',  'Target',  'silver', 'missions',   50,  'missions_total',  20),
('missions_100', '100 Einsätze!',         '100 Einsätze erfasst', 'Target',  'gold',   'missions',   100, 'missions_total',  30),
('missions_250', 'Einsatz-Legende',       '250 Einsätze erfasst', 'Crown',   'platinum','missions',  250, 'missions_total',  40),
('pursuits_10',  'Verfolgungs-Starter',   '10 Verfolgungen',      'Car',     'bronze', 'pursuits',   10,  'pursuits_total',  50),
('pursuits_50',  'Sky-Hunter',            '50 Verfolgungen',      'Car',     'silver', 'pursuits',   50,  'pursuits_total',  60),
('pursuits_100', 'Top-Gun',               '100 Verfolgungen',     'Car',     'gold',   'pursuits',   100, 'pursuits_total',  70),
('pursuits_week_10', 'Verfolgungs-Sturm', '10 Verfolgungen in einer Woche', 'Zap', 'gold', 'pursuits', 10, 'pursuits_week', 80),
('protocols_10', 'Protokoll-Schreiber',   '10 Protokolle geführt','FileText','bronze', 'protocols',  10,  'protocols_total', 90),
('protocols_50', 'Wort-Akrobat',          '50 Protokolle geführt','FileText','silver', 'protocols',  50,  'protocols_total', 100),
('formation_10', 'Aufstellungs-Profi',    '10 Aufstellungen geleitet','ClipboardList','silver','formations',10,'formations_total',110),
('uebung_5',     'Trainings-Teilnehmer',  '5 Übungen besucht',    'GraduationCap','bronze','training',5,'uebungen_attended',120),
('exam_passed',  'Theorie bestanden',     'Theorieprüfung erfolgreich','BookOpen','gold','training',1,'theory_passed',130),
('practical_passed','ASD1/ASD2 bestanden','Praktische Prüfung bestanden','Award','gold','training',1,'practical_passed',140),
('jackpot',      'Jackpot-Gewinner',      '4 gleiche Symbole im Slot','Trophy','platinum','casino',1,'casino_jackpot',150),
('millionaire',  'Millionär',             '1.000.000 $ Casino-Guthaben','Coins','gold','casino',1000000,'casino_balance',160),
('challenge_1',  'Challenge-Champion',    'Erste Wochen-Challenge geschafft','Star','bronze','challenges',1,'challenges_total',170)
ON CONFLICT (code) DO NOTHING;
