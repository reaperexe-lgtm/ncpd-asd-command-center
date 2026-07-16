-- Meldeaufforderungen: Direction/Supervisor können ein Mitglied dazu auffordern,
-- sich bei einem oder mehreren frei wählbaren Ansprechpartnern zu melden.
-- Verwendet dieselben Discord-Channels wie die Sanktionsverwaltung.

CREATE TABLE IF NOT EXISTS public.meldeaufforderungen (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_name text NOT NULL,
  target_dienstnummer text,
  target_discord_id text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ user_id, name, discord_id, internal_dienstnummer }]
  notiz text,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_by_name text NOT NULL,
  issued_by_discord_id text,
  discord_message_id text,
  discord_reason_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meldeaufforderungen ENABLE ROW LEVEL SECURITY;

-- is_admin() deckt director, co_director, supervisor, admin, team_red ab.
CREATE POLICY "Direction can view meldeaufforderungen"
ON public.meldeaufforderungen FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Direction can create meldeaufforderungen"
ON public.meldeaufforderungen FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Direction can delete meldeaufforderungen"
ON public.meldeaufforderungen FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_meldeaufforderungen_created_at ON public.meldeaufforderungen (created_at DESC);
