## Was wird gefixt (13 Findings)

### A. Datenbank-Migration (1 großer Migration-File)

1. **theory_exam_results — anon abuse** (2 Findings)
   - Drop policy `Anon can view own exam by id` (USING true)
   - Replace `Anyone can submit exam` (WITH CHECK true) → INSERT nur für `authenticated` + `dienstnummer = profile.dienstnummer des auth.uid()`

2. **user_achievements — Self-Award entfernen**
   - Drop INSERT policy für User. Achievements werden ab sofort nur noch von Admin/Edge-Function vergeben (Service-Role).
   - Bestehender Client-Award-Code wird auf Edge-Function `award-achievements` umgestellt (mit JWT-Validierung, Server-berechnete Metriken).

3. **profiles — sensible Felder verbergen**
   - Neue Tabelle `profiles_private` (user_id PK, phone_number, birthday, discord_id, internal_dienstnummer)
   - Daten aus `profiles` migrieren, dann Spalten droppen
   - RLS: nur Owner + Admin lesen, Owner + Admin schreiben
   - **Sichtbare Konsequenz:** Ausbilder-Telefonnummern werden Bewerbern NICHT mehr angezeigt (Karte zeigt nur Name + Dienstnummer). Geburtstage in MemberOfMonth-Karte sind für Nicht-Admins verborgen.

4. **can_manage_map — Berechtigung einschränken**
   - Function ändert sich: nur `admin/director/co_director/supervisor/ausbilder/trial_ausbilder` (statt jeder approved User)
   - **Sichtbare Konsequenz:** Member können Karten-Hintergründe/Settings/Areas/Drawings nicht mehr selbst erstellen — nur noch Ausbilder+

5. **Storage: avatars upload tightening**
   - Drop `Authenticated users can upload avatars`, replace mit Check `(storage.foldername(name))[1] = auth.uid()::text`

6. **Storage: pursuit-photos duplicate**
   - Drop `Authenticated can upload pursuit photos` (Duplikat ohne Approval-Check)

7. **Storage: public bucket listing** (3 Buckets)
   - Drop broad `Anyone can view avatars/pursuit photos/assets` SELECT-Policies für `public` Role. Bucket bleibt public — direkte URL-Reads funktionieren weiter, nur Listing geht nicht mehr ohne Auth.

8. **SECURITY DEFINER Functions Anon-Execute**
   - REVOKE EXECUTE ... FROM anon, public auf allen `public.*` Definer-Funktionen, die kein Anon-Aufruf brauchen.
   - Authenticated EXECUTE bleibt für `is_approved`, `has_role`, `is_admin`, `can_*` (von RLS-Policies benötigt).

### B. Auth Konfiguration
9. **Leaked password protection** via `configure_auth` aktivieren.

### C. Code-Anpassungen

- `src/lib/achievements.ts` → Awarding über `supabase.functions.invoke("award-achievements")` statt direkt insert
- Neue Edge-Function `award-achievements` (validiert JWT, berechnet Metriken serverseitig, schreibt mit Service-Role)
- `src/pages/ProfilePage.tsx` → liest sensitive Felder aus `profiles_private` (eigener Datensatz)
- `src/pages/AdminPanel.tsx` → `discord_id` aus `profiles_private`
- `src/components/AusbilderKontakte.tsx` + beide Applicant-Dashboards → Telefonnummer-Spalte entfernen
- `src/components/MemberOfMonthCard.tsx` → Birthday-Anzeige nur für Admins (verbergen für andere)
- `src/components/MilestoneCelebrations.tsx` → Birthday eigenes Profil via `profiles_private`
- `src/pages/MemberPage.tsx` → Birthday-Edit/Anzeige nur für Admin
- Karten-Verwaltungs-UI (`OrtskundePage`) prüft jetzt strengere Permission — Buttons für Member ausblenden

### D. Nicht umsetzbar
- **Realtime.messages Policies** — Schema `realtime` ist von Lovable Cloud aus nicht editierbar. Muss manuell im Backend gemacht werden, falls überhaupt nötig (kann auch über Channel-Naming + Server-Push umgangen werden). Wird als Hinweis im Memory dokumentiert.

### Ablauf
1. Migration ausführen (mit Datentransfer für profiles_private)
2. configure_auth für HIBP
3. Edge-Function `award-achievements` deployen
4. Alle betroffenen Frontend-Dateien anpassen
5. Security-Findings markieren

Ist das so OK? Insbesondere die UX-Änderungen unter Punkt 3 (Telefonnummern weg, Geburtstage Admin-only) und Punkt 4 (Map-Verwaltung nur noch Ausbilder+) sind sichtbar.