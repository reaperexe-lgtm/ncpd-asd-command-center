## Plan: Navigation-Sortierung + Ortskunde-Erweiterung

### 1. Sidebar Navigation neu sortierbar (Admin)
- Neue Tabelle `nav_order` (key, sort_order) — Admin kann via Drag/Pfeile in Admin Panel reihenfolge ändern
- `AppSidebar.tsx` liest die Sortierung; Fallback auf Default
- Neue Section im AdminPanel: "Navigation Reihenfolge" mit ↑/↓ Buttons

### 2. Ortskunde — Berechtigungen öffnen
- `can_manage_map` ändern: alle approved User dürfen Orte/Gebiete/Zeichnungen hinzufügen+bearbeiten
- Löschen+Karten verwalten weiterhin nur Admin/Director/Co-Director/Supervisor/Ausbilder

### 3. Marker-Erweiterungen
- `map_locations` neue Spalten: `icon` (text — Emoji oder Lucide-Icon-Key), `icon_type` ('emoji' | 'lucide' | 'pin')
- Beim Anlegen: Emoji-Picker (vorgegebene Auswahl: 💊 🌳 ⭐ 🏠 🏨 🍽️ ⚔️ 📍 🚓 🛒 ⛽ 🏥 …) plus Custom-Eingabe
- RGB-Farb-Picker (HEX/RGB Input zusätzlich zum Schnellwähler)

### 4. Gebiete (Polygone) zeichnen
- Neue Tabelle `map_areas`: `id, background_id, name, color, fill_opacity, points jsonb (Array von {x,y}), is_hidden, created_by`
- Zeichen-Modus: Klicks auf Karte fügen Punkte hinzu, Doppelklick / "Fertig"-Button schließt Polygon
- SVG-Overlay rendert Polygone; Klick auf Polygon → Popup mit Name (analog Marker-Popup)

### 5. Freihand-Zeichnungen / Linien (Routen)
- Neue Tabelle `map_drawings`: `id, background_id, name, color, stroke_width, points jsonb, created_by`
- Zeichen-Modus "Linie/Route": Klicks setzen Punkte, "Fertig" speichert; SVG-Polyline

### 6. Legende mit Bezirken & Kategorien
- Sidebar-Panel ersetzen: gruppierte Liste nach `category` mit Counter `(N)`, Collapsible
- Default-Kategorien: Bezirke, Fraktionen, Polizei, Sonstiges, Regierung, Krankenhaus, Restaurant, Shops, Garagen, Parks, Immobilien
- Pro Gruppe: "Alle aus" Toggle (filtert Marker auf der Karte sichtbar/unsichtbar)
- Klick auf Eintrag → springt+zoomt zur Position (wie bisher)

### 7. Versteckte Punkte / Passwortschutz
- Neue Tabelle `map_hidden_password`: single row, `password text` (klartext, da nur Admin/Director/Supervisor lesen sollen)
- Marker/Gebiete mit `is_hidden=true` werden standardmäßig ausgeblendet
- Button "Versteckte Punkte" oben → Passwort-Dialog; bei korrektem Passwort werden hidden Items in der Session sichtbar
- Im AdminPanel neuer Bereich "Versteckte Punkte Passwort": Eingabe+Speichern, **nur sichtbar für `admin`, `director`, `supervisor`**

### Technische Details
- Migration: 4 neue Tabellen, RLS Policies, neue Helper-Function `can_view_hidden_password` (admin/director/supervisor)
- Storage: keine Änderungen
- UI Komponenten: `EmojiPicker`, `ColorPicker`, `DrawingToolbar` in `OrtskundePage.tsx`
- Performance: SVG-Overlay innerhalb des transformed map-canvas, sodass Pan/Zoom mitgehen

### Offene Annahmen
- Ich nutze ein eingebautes Emoji-Set (~30 Symbole) plus Freitext-Eingabe statt einer großen Picker-Library
- Polygone werden als gefüllte Flächen mit ~25% Opacity gerendert
- Sortierung der Sidebar wirkt für alle User; nur Admin kann ändern