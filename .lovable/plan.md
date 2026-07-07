## Fix: „Email not confirmed" bei neuen Bewerbern

### Ursache
Der Login läuft über generierte Fake-Adressen (`pd-xxx@asd.local`). Aktuell ist in den Auth-Settings **Email-Confirmation aktiv**, sodass neu erstellte Bewerber-Accounts nicht einloggen können — es kommt keine Bestätigungsmail an (Domain existiert nicht). Bestehende (bereits bestätigte) User sind nicht betroffen, deshalb erst jetzt aufgefallen.

### Fix
`supabase--configure_auth` aufrufen mit `auto_confirm_email: true`. Damit werden neue Accounts automatisch bestätigt — passt zum Dienstnummer-Login (kein echter Mailversand nötig).

- `disable_signup: false`
- `external_anonymous_users_enabled: false`
- `auto_confirm_email: true`
- `password_hibp_enabled: false` (wie zuvor deaktiviert)

### Nachbehandlung
Die 3 bestehenden Bewerber-Accounts, die noch als „unconfirmed" markiert sind, per Migration bestätigen (`UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL`) — nur für die betroffenen Bewerber-IDs, damit sie sich sofort einloggen können.
