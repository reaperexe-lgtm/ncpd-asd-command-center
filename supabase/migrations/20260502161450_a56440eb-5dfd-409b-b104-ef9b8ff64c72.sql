ALTER TABLE public.achievement_definitions
  ADD COLUMN IF NOT EXISTS base_code text,
  ADD COLUMN IF NOT EXISTS tier_level integer;

CREATE INDEX IF NOT EXISTS idx_achievement_defs_base_code
  ON public.achievement_definitions(base_code, tier_level);