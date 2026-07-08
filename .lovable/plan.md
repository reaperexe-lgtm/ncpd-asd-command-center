## Ziel
Admins (und andere) sollen eine **Zweitrolle** (z. B. Director) tragen können, damit sie unter „Members" sichtbar bleiben — ohne ihre Admin-Rechte zu verlieren.

## Konzept
`user_roles` unterstützt technisch bereits mehrere Rollen pro User (PK auf `(user_id, role)`), aber Code & UI behandeln nur *eine* Rolle. Wir führen das Konzept **Primärrolle = Rechte-/System-Rolle** und **Anzeigerolle = Members-Sektion** ein.

Regel:
- Rangfolge Primärrolle (für Rechte): `admin > director > co_director > supervisor > ausbilder > trial_ausbilder > member > trial_member > asd_applicant > flight_applicant > flight_license > team_red`
- Anzeigerolle in Members: höchste **nicht-versteckte** Rolle (versteckt = `admin`, `asd_applicant`, `flight_applicant`, `flight_license`).
- Ein User mit `admin` **und** `director` → hat Admin-Rechte, erscheint in Members-Sektion „Director".

## Änderungen

### 1. DB
- Sicherstellen, dass `user_roles` PK/Unique auf `(user_id, role)` liegt (nicht auf `user_id` allein). Falls ein `UNIQUE(user_id)` existiert → droppen.
- Neue Security-Definer-Funktion `get_display_role(_user_id uuid)` → gibt höchste nicht-versteckte Rolle zurück (für Members-Sortierung).
- `get_user_role` bleibt, wird aber angepasst: liefert höchste Rolle nach Rang (statt `LIMIT 1` willkürlich).
- Zweitrolle für deinen Admin-Account eintragen (z. B. Director) — Rolle sagst du mir nach Approval, oder ich verwende `director` als Default.

### 2. AuthContext (`src/contexts/AuthContext.tsx`)
- `fetchUserData`: alle Rollen laden statt `.maybeSingle()`, primary = höchste per Rang.
- Neuen Wert `roles: AppRole[]` im Context bereitstellen (rückwärtskompatibel — `role` bleibt).

### 3. MemberPage (`src/pages/MemberPage.tsx`)
- Query: alle `user_roles`-Einträge laden, pro Profil die **Anzeigerolle** ermitteln (höchste nicht-versteckte). User ohne Anzeigerolle → weiter ausblenden.
- Optional Badge „Admin" auf der Karte, wenn zusätzlich `admin` vorhanden.

### 4. Admin-Panel (Rollen-Verwaltung)
- In `PermissionMatrixSection` / Benutzer-nach-Rolle: neuer Button „Zweitrolle hinzufügen/entfernen" pro User.
- Mutation: `INSERT INTO user_roles(user_id, role)` bzw. `DELETE ... WHERE user_id AND role`.
- `roleMutation` (Rolle *ändern*) bleibt, wird aber zu „Primärrolle ändern" (löscht nur die alte Primärrolle, nicht alle).

## Nicht betroffen
Alle bestehenden `has_role`-basierten RLS-Policies und Server-Checks funktionieren unverändert — sie prüfen bereits pro Rolle, nicht pro User.

## Offene Frage (nach Approval)
Welche Anzeigerolle möchtest du für dich? (Director / Co-Director / Supervisor / …) — sag es kurz, dann setze ich sie mit ein.