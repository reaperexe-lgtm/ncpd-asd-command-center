## Problem
Klick auf "Passwort zurücksetzen" wirft `Edge Function returned a non-2xx status code`. In den Logs der Function `reset-user-password` gibt es **keine Einträge** – d.h. die Function wurde entweder nie erfolgreich deployed oder scheitert direkt beim Auth-Check und liefert 401/403, ohne dass wir eine Fehlerursache im Client sehen.

## Ursache (wahrscheinlich)
Die Function nutzt aktuell:

```ts
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const { data: { user } } = await supabase.auth.getUser(token);
```

Auf einem Service-Role-Client ist `getUser(token)` unzuverlässig – der neue Signing-Keys-Ansatz erwartet Token-Validierung via `getClaims(token)`. Wenn der Aufruf `user = null` zurückgibt, antwortet die Function mit **401 "Invalid token"** – exakt das Verhalten, das der Client als "non-2xx" sieht.

## Fix-Plan

1. **`supabase/functions/reset-user-password/index.ts` überarbeiten**
   - Auth-Header prüfen (`Bearer …`) und mit `supabase.auth.getClaims(token)` validieren (empfohlener Pattern für Signing Keys).
   - `userId = claims.sub` verwenden, Rolle über Service-Role-Client aus `user_roles` laden.
   - Rollencheck bleibt: nur `admin`, `director`, `co_director` dürfen zurücksetzen.
   - CORS-Header aus `npm:@supabase/supabase-js@2/cors` importieren (statt handgeschriebener Header).
   - Aussagekräftige `console.error`-Logs bei jedem Fehlerpfad, damit wir es beim nächsten Fehler in den Function-Logs sehen.
   - Input-Validierung: `{ userId: string(uuid) }` per Zod.

2. **Client (`AdminPanel.tsx`) robuster machen**
   - In `onError` zusätzlich zum `error.message` den evtl. mitgelieferten `context.responseText` / `data.error` mit ausgeben, damit man die tatsächliche Fehlermeldung im Toast sieht statt der generischen "non-2xx"-Meldung.

3. **Redeploy erzwingen**
   - Nach der Änderung wird die Function automatisch neu deployed. Danach mit `curl_edge_functions` einen Testaufruf machen und Logs prüfen.

## Nicht geändert
- Passwortwert bleibt `ASD123`.
- Berechtigte Rollen bleiben `admin | director | co_director`.
- UI-Flow (AlertDialog + Button) bleibt gleich.
