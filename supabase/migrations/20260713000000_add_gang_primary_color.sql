-- Add primary_color column to gangs (used to auto-fill vehicle color when a gang is selected in Einsatz)
ALTER TABLE public.gangs ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#000000';
