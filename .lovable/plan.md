## Ziel
User können ihr eigenes Passwort selbst ändern (nachdem Admin es auf "ASD123" zurückgesetzt hat oder jederzeit).

## Umsetzung

**Neue Sektion in `src/pages/ProfilePage.tsx`**
Am Ende der Seite eine neue Card "Passwort ändern" hinzufügen mit:
- Feld: Neues Passwort (min. 6 Zeichen)
- Feld: Passwort bestätigen
- Button: "Passwort ändern"
- Show/Hide-Toggle (Auge-Icon) für beide Felder

**Logik**
- Validierung: beide Felder identisch, min. 6 Zeichen
- Aufruf: `supabase.auth.updateUser({ password })`
- Erfolg → Toast "Passwort geändert", Felder leeren
- Fehler → Toast mit Fehlermeldung

**Design**
- Gleicher Card-Stil wie andere Sektionen (`bg-card border border-border rounded-lg p-5`)
- Icon: `Lock` oder `KeyRound` von lucide-react
- Passt sich ins bestehende dunkel-grüne Theme ein

## Nicht Teil dieses Plans
- Kein "aktuelles Passwort abfragen" (Supabase verlangt es bei eingeloggten Usern nicht)
- Keine Änderung an Admin-Reset-Funktion
- Kein "Passwort vergessen"-Flow per E-Mail (kann bei Bedarf separat kommen)
