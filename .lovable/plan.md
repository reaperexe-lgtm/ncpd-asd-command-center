## Ursache
Beim Remix des Projekts wurde die Funktion `handle_new_user()` übernommen, aber der **Trigger auf `auth.users`** fehlt. Deshalb wird bei einer Neuregistrierung weder ein `profiles`- noch ein `user_roles`-Eintrag angelegt — der Bewerber existiert nur in `auth.users` und taucht nirgends in der UI auf.

Betroffen: **Pablo Morales (PD-15)**, registriert 12:54 Uhr als ASD-Bewerber.

## Fix (eine Migration)

1. **Trigger neu anlegen** auf `auth.users`:
   ```sql
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```
2. **Pablo nachtragen** (Profil + Rolle `asd_applicant`, `is_approved=true`), damit er sofort im ASD-Bewerber-Bereich erscheint und von Ausbildern/Admins abgearbeitet werden kann.

## Ergebnis
- Neuregistrierungen legen ab sofort automatisch Profil + Rolle an.
- Pablo taucht unter „ASD-Bewerber verwalten" auf.

## Nicht Teil des Fixes
Keine Änderungen an UI, Rollen-Logik oder anderen Tabellen.
