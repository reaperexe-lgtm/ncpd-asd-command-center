-- Add pearl_color column to gangs (second auto-detected color from Erkennungsmerkmale)
ALTER TABLE public.gangs ADD COLUMN IF NOT EXISTS pearl_color text DEFAULT '#000000';
