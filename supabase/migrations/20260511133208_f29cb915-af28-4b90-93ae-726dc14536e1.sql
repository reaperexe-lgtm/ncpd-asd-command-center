-- Make created_by nullable and switch FKs to SET NULL on delete
ALTER TABLE public.missions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_protokollschreiber_fkey;
ALTER TABLE public.missions ADD CONSTRAINT missions_protokollschreiber_fkey
  FOREIGN KEY (protokollschreiber) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_created_by_fkey;
ALTER TABLE public.missions ADD CONSTRAINT missions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.theory_exam_results DROP CONSTRAINT IF EXISTS theory_exam_results_reviewed_by_fkey;
ALTER TABLE public.theory_exam_results ADD CONSTRAINT theory_exam_results_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Remove orphan auth user PD-57
DELETE FROM public.user_roles WHERE user_id = 'aff8900a-e8d3-471b-a820-54d1a8b31ac9';
DELETE FROM public.profiles WHERE id = 'aff8900a-e8d3-471b-a820-54d1a8b31ac9';
DELETE FROM auth.users WHERE id = 'aff8900a-e8d3-471b-a820-54d1a8b31ac9';