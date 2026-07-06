## Problem

Die `discord_id`-Spalte wurde aus der `profiles`-Tabelle in die neue Tabelle `profiles_private` verschoben. Alle Edge Functions lesen aber weiterhin aus `profiles` – dadurch:

- **Director-DMs (Achievements, Reset-Anfragen, Übungsteilnehmer, Weekly Performance)**: Query schlägt still fehl → keine Discord-Nachrichten mehr.
- **Automatischer Wochenbericht**: Profile-Join liefert nichts → jeder Rang zeigt „Unbekannt", kein `<@discord_id>`-Ping der Top-Schreiber.

## Fix

In allen betroffenen Edge Functions den `discord_id`-Lookup auf `profiles_private` umstellen und mit `profiles` (Name/Dienstnummer) per zweiter Query zusammenführen.

### Betroffene Dateien

1. **`supabase/functions/discord-weekly-report/index.ts`**
   - `profiles`-Select nur `id, name`; zusätzlicher Select aus `profiles_private` (`user_id, discord_id`) für dieselben IDs; Map zusammenführen.

2. **`supabase/functions/discord-notify/index.ts`**
   - `reset_request` (Zeile ~178): admin-`discord_id` aus `profiles_private` holen, Name aus `profiles`.
   - `achievement_unlocked` User-DM (~457): `discord_id` des Users aus `profiles_private`.
   - `achievement_unlocked` Direction-DMs (~493): Direction `discord_id` aus `profiles_private`, Namen aus `profiles`.

3. **`supabase/functions/uebung-reminders/index.ts`**
   - Test-DM (~47) und Reminder-Batch (~122): `discord_id` aus `profiles_private`, Namen aus `profiles` zusammenführen.

4. **`supabase/functions/weekly-performance-check/index.ts`**
   - User-Profil (~125): `name, dienstnummer` aus `profiles`, `discord_id` separat aus `profiles_private`.
   - Direction-DMs (~192): analog wie oben.

5. **`supabase/functions/discord-interactions/index.ts`** (Zeile 340)
   - `/stats`-Slash-Command sucht Profil per `discord_id` in `profiles`. Umstellen: zuerst `profiles_private.user_id` per `discord_id` finden, dann `profiles` per `id` laden.

### Keine sonstigen Änderungen

- Kein Schema-Change, keine RLS-Änderung (Service Role liest `profiles_private` ohnehin).
- Client-Code und UI bleiben unverändert.
- Kein Verhalten der Nachrichteninhalte ändert sich – nur die Datenquelle für `discord_id`.
