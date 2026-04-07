CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view scores" ON public.game_scores
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

CREATE POLICY "Users can insert own scores" ON public.game_scores
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());