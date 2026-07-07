## Test-Nachricht Button im Admin-Bereich

Neuer Button im Admin-Panel, der eine Testnachricht in den konfigurierten Discord Announcement-Channel schickt.

### Änderungen

**1. Edge Function `discord-notify` erweitern**
- Neuen Action-Typ `test_channel_message` hinzufügen
- Postet über den Discord Bot Token eine kurze Nachricht (`✅ Test-Nachricht aus dem ASD Dashboard – ausgelöst von <Name> um <Uhrzeit>`) in `DISCORD_ANNOUNCEMENTS_CHANNEL_ID`
- Nur für Admin/Director/Co-Director erlaubt (Rollencheck via `has_role`)

**2. UI im Admin-Bereich**
- Neuer Karten-Abschnitt „Discord Test" mit Button „Testnachricht senden"
- Beim Klick: `supabase.functions.invoke('discord-notify', { body: { action: 'test_channel_message' } })`
- Toast bei Erfolg/Fehler, Button während Ausführung disabled

### Technische Details

- Datei: `supabase/functions/discord-notify/index.ts` – neuer Switch-Case
- Datei: die bestehende Admin-Settings-Seite (wird bei Umsetzung lokalisiert, z.B. `src/pages/AdminPage.tsx` bzw. dort wo bereits Aufstellung-Settings liegen)
- Kein DB-Schema-Change, keine neuen Secrets nötig (Bot Token + Channel ID bereits vorhanden)
