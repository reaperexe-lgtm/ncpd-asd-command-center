/**
 * HUD DESIGN SYSTEM - Usage Guide
 * 
 * Eine globale Sammlung von CSS-Klassen und Komponenten für ein cohesives
 * Tactical/HUD-Design. Diese Utilities werden auf alle Seiten automatisch angewendet.
 * 
 * ============================================================================
 * 1. CARDS & CONTAINERS
 * ============================================================================
 * 
 * .hud-card
 * - Hover-Effekt: translateY(-2px) + grüner glow box-shadow
 * - Smooth transition (150ms)
 * - Verwendung: Alle Card-Komponenten (Home, Member, Statistik, etc.)
 * 
 * Beispiel:
 * <div className="bg-card border border-border rounded-lg p-5 hud-card">
 *   Card Content
 * </div>
 * 
 * 
 * ============================================================================
 * 2. BADGES & STATUS INDICATORS
 * ============================================================================
 * 
 * .hud-badge + Variant
 * - Varianten: hud-badge-gold, hud-badge-green, hud-badge-red, hud-badge-blue, hud-badge-purple
 * - Automatische Glow-Effekte, Hover-Animation
 * - Verwendung: Rollen (Director, Ausbilder, Trial), Anwesenheitsstatus
 * 
 * Beispiel mit Komponente:
 * <HUDStatusBadge label="Director" variant="gold" />
 * <HUDStatusBadge label="Aktiv" variant="green" />
 * <HUDStatusBadge label="Gesperrt" variant="red" />
 * 
 * Beispiel mit CSS:
 * <span className="hud-badge hud-badge-gold">Director</span>
 * 
 * 
 * ============================================================================
 * 3. ONLINE INDICATORS
 * ============================================================================
 * 
 * .online-indicator
 * - Pulsierender grüner Punkt (CSS-Animation, kein JS)
 * - Doppelter Effekt: Pulsing Outer + Steady Inner
 * - Verwendung: Online-Status bei Usern
 * 
 * Beispiel:
 * <div className="w-3 h-3 rounded-full online-indicator" />
 * 
 * 
 * ============================================================================
 * 4. GLOW TEXT & NUMBERS
 * ============================================================================
 * 
 * .glow-text
 * - Monospace Font (JetBrains Mono)
 * - Sanfte text-shadow Glow
 * - Verwendung: Normale numerische Daten
 * 
 * .glow-text-large
 * - Größere Variante mit pulsierendem Glow
 * - Größe: 1.875rem (30px)
 * - Verwendung: Große Statistiken, Highlight-Zahlen
 * 
 * .stat-glow
 * - Extra starker Glow für sehr große Zahlen
 * - Größe: 2.25rem (36px)
 * - Letter-spacing für Tech-Look
 * - Verwendung: Zentrale KPIs, Achievements
 * 
 * Beispiel:
 * <p className="glow-text">ID: 1234567890</p>
 * <p className="glow-text-large">42</p>
 * <div className="stat-glow">892</div>
 * 
 * 
 * ============================================================================
 * 5. LIVE BADGES & NOTIFICATIONS
 * ============================================================================
 * 
 * .live-badge
 * - Inline-Badge mit pulsierendem Punkt davor
 * - Text: "LIVE" oder Status-Indikator
 * - Verwendung: Aktive Einsätze, Live-Events
 * 
 * Beispiel:
 * <span className="live-badge">1 Online</span>
 * <span className="live-badge">Einsatz Aktiv</span>
 * 
 * 
 * ============================================================================
 * 6. BUTTONS & INTERACTIVE ELEMENTS
 * ============================================================================
 * 
 * .pulse-ring
 * - Sonar-Effekt mit ausgehenden Rings
 * - Verwendet auf ::before Pseudo-Element
 * - Verwendung: FAB (+Button), Primary Action Buttons
 * 
 * Beispiel:
 * <button className="rounded-full bg-primary text-white pulse-ring">
 *   <Plus className="w-6 h-6" />
 * </button>
 * 
 * Alle Buttons kriegen automatisch:
 * - Hover-Glow (box-shadow)
 * - Focus-State mit Glow
 * - Smooth transition
 * 
 * 
 * ============================================================================
 * 7. VISUAL SEPARATORS
 * ============================================================================
 * 
 * .hud-divider
 * - Gradient-Linie mit transparenten Enden
 * - Sehr dezent (20% opacity aktuell)
 * - Verwendung: Zwischen Card-Inhalten, Sections
 * 
 * Beispiel:
 * <div className="hud-divider" />
 * 
 * 
 * .fade-underline
 * - Fading underline unter Text
 * - Wird als ::after Pseudo-Element gerendert
 * - Verwendung: Headings, wichtige Labels
 * 
 * Beispiel:
 * <h2 className="fade-underline">Abschnitt Title</h2>
 * 
 * 
 * ============================================================================
 * 8. BACKGROUND EFFECTS
 * ============================================================================
 * 
 * .vignette
 * - Radiales Gradient-Overlay (dunker an den Rändern)
 * - Wird als ::after Pseudo-Element gerendert
 * - Verwendung: Über Hintergrundbildern auf Home/Dashboards
 * 
 * Beispiel:
 * <div className="vignette" style={{ backgroundImage: 'url(...)' }}>
 *   Content here
 * </div>
 * 
 * 
 * .ken-burns
 * - Langsames, dezentes Zoom/Pan (20s Animation)
 * - GPU-beschleunigt (transform + will-change)
 * - Verwendung: Hintergrundbilder für dynamischen Look
 * 
 * Beispiel:
 * <div className="absolute inset-0 ken-burns" style={{ backgroundImage: 'url(...)' }} />
 * 
 * 
 * ============================================================================
 * 9. ANIMATIONS
 * ============================================================================
 * 
 * .float-up
 * - Fade-in + Slide-up Animation (400ms)
 * - Cubic-Bezier easing für "bouncy" Effekt
 * - Verwendung: Neue Einträge, Notifications
 * 
 * Beispiel:
 * <div className="float-up">
 *   Neue Benachrichtigung
 * </div>
 * 
 * 
 * ============================================================================
 * 10. SIDEBAR ITEMS
 * ============================================================================
 * 
 * .sidebar-item-active
 * - Schmaler grüner 4px Bar am linken Rand
 * - Mit Glow-Effekt unter der Bar
 * - Pulsierender Glow
 * 
 * .sidebar-item
 * - Hover: scale(1.02) + Icon färbt sich grün
 * - Smooth 150ms transition
 * - Kein Layout-Shift
 * 
 * Hinweis: Für echte Implementierung müssen bestehende Sidebar-Komponenten
 * angepasst werden, um diese Klassen zu verwenden.
 * 
 * 
 * ============================================================================
 * PERFORMANCE NOTES
 * ============================================================================
 * 
 * ✓ Nur CSS Transforms und Opacity (GPU-beschleunigt)
 * ✓ Will-change nur wo nötig (z.B. ken-burns)
 * ✓ Kein backdrop-filter auf großen Flächen (zu teuer)
 * ✓ Minimal Scanline-Overlay (nur 3% Opacity, sehr dezent)
 * ✓ Keyframes nutzen einfache properties (keine komplexen Calculationen)
 * ✓ Alle Animationen sind wiederholenlose oder infinite mit kontinuierlichem Loop
 * 
 * 
 * ============================================================================
 * CSS VARIABLES (können in Tailwind/Custom CSS verwendet werden)
 * ============================================================================
 * 
 * --accent-glow-sm: 0 0 8px rgba(34, 197, 94, 0.3)      // Feiner Glow
 * --accent-glow: 0 0 12px rgba(34, 197, 94, 0.5)        // Standard Glow
 * --accent-glow-lg: 0 0 20px rgba(34, 197, 94, 0.6)     // Großer Glow
 * --accent-glow-xl: 0 0 30px rgba(34, 197, 94, 0.7)     // Extra großer Glow
 * 
 * Beispiel:
 * <div style={{ boxShadow: 'var(--accent-glow-lg)' }}>
 *   Extra glow effect
 * </div>
 * 
 */

export {};
