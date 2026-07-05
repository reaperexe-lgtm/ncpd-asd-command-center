## Fix

HIBP-Check in Auth-Settings deaktivieren, damit `ASD123` als Reset-Passwort akzeptiert wird.

## Schritt

- `configure_auth` aufrufen mit `password_hibp_enabled: false` (übrige Werte bleiben wie sie sind: signup aktiv, keine Anonymous-User, kein Auto-Confirm).

## Hinweis
Dadurch prüft Lovable Cloud Passwörter bei Signup/Reset nicht mehr gegen die HaveIBeenPwned-Datenbank. Reduziert die Sicherheit leicht, ist aber deine explizite Wahl. Danach funktioniert der Reset-Button ohne weitere Code-Änderung.
