-- Entfernt Search & Rescue und Ortskunde/Karte vollständig.
-- Beide Features wurden im Frontend nicht mehr genutzt (keine Route/kein Nav-Link
-- mehr vorhanden). Alle hier gelöschten Objekte werden ausschließlich von diesen
-- beiden Features befüllt/gelesen -- keine anderen Tabellen, Policies oder
-- Edge Functions referenzieren sie, daher ist kein Datenverlust bei anderen
-- Funktionen zu erwarten.

-- ============================================================================
-- 1. Storage: Die Ortskunde-Dateien im geteilten "assets"-Bucket (Pfad-Präfix
--    "ortskunde/") können NICHT per SQL gelöscht werden -- Supabase blockiert
--    direktes DELETE auf storage.objects (siehe storage.protect_delete()).
--    Bitte manuell über Dashboard -> Storage -> Bucket "assets" -> Ordner
--    "ortskunde/" loeschen, oder per Storage API (supabase.storage.from
--    ("assets").remove([...])). Der Bucket selbst bleibt bestehen, da er auch
--    von anderen Features genutzt wird.
-- ============================================================================

-- ============================================================================
-- 2. Search & Rescue Tabellen
-- ============================================================================
DROP TABLE IF EXISTS public.sr_theory_exam_results CASCADE;
DROP TABLE IF EXISTS public.sr_training_progress CASCADE;
DROP TABLE IF EXISTS public.sr_training_signups CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_sr_training;

-- ============================================================================
-- 3. Ortskunde / Karte Tabellen
--    (map_locations/map_areas/map_drawings referenzieren map_backgrounds,
--    daher zuerst die abhängigen Tabellen, dann map_backgrounds selbst)
-- ============================================================================
DROP TABLE IF EXISTS public.map_locations CASCADE;
DROP TABLE IF EXISTS public.map_areas CASCADE;
DROP TABLE IF EXISTS public.map_drawings CASCADE;
DROP TABLE IF EXISTS public.map_hidden_password CASCADE;
DROP TABLE IF EXISTS public.map_settings CASCADE;
DROP TABLE IF EXISTS public.map_backgrounds CASCADE;
