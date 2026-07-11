import HUDStatusBadge from "@/components/HUDStatusBadge";
import { Zap, Shield, Users, TrendingUp } from "lucide-react";

/**
 * HUD Design System - Visual Reference
 * 
 * Diese Komponente dokumentiert und zeigt alle verfügbaren HUD-Design-Utilities.
 * Sie kann als Referenz während der Entwicklung verwendet werden.
 */

export const HUDDesignReference = () => {
  return (
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold mb-2">HUD Design System</h1>
        <p className="text-muted-foreground">Globale Design-Utilities für Tactical/HUD-Look</p>
      </div>

      {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Cards mit Hover-Glow</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-6 hud-card space-y-3"
            >
              <h3 className="font-bold text-primary">Card {i}</h3>
              <p className="text-xs text-muted-foreground">
                Hover über diese Card für glow Effekt + Transform
              </p>
              <div className="pt-2 border-t border-border">
                <p className="text-sm">Dezente Trennlinien</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Status Badges</h2>
        <div className="flex flex-wrap gap-3">
          <HUDStatusBadge label="Director" variant="gold" icon={<Shield className="w-3 h-3" />} />
          <HUDStatusBadge label="Aktiv" variant="green" />
          <HUDStatusBadge label="Trial" variant="red" />
          <HUDStatusBadge label="Online" variant="blue" />
          <HUDStatusBadge label="Member" variant="purple" />
        </div>
      </section>

      {/* Live Badge */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Live Indicators</h2>
        <div className="flex gap-4">
          <span className="live-badge">2 Online</span>
          <span className="live-badge">Einsatz Aktiv</span>
          <span className="live-badge">Broadcasting</span>
        </div>
      </section>

      {/* Glow Text & Numbers */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Glow Text Styles</h2>
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs text-muted-foreground mb-2">Standard Glow (ID, Code)</p>
            <p className="glow-text">PD-12345678</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs text-muted-foreground mb-2">Large Glow (Normale Zahlen)</p>
            <p className="glow-text-large">2,847</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs text-muted-foreground mb-2">Stat Glow (Große KPIs)</p>
            <div className="stat-glow">892</div>
          </div>
        </div>
      </section>

      {/* Online Indicator */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Online Indicator</h2>
        <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full online-indicator" />
          <span className="text-sm">User ist online (pulsierender Punkt)</span>
        </div>
      </section>

      {/* Dividers */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Dividers</h2>
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <p className="text-sm">Oben</p>
          <div className="hud-divider" />
          <p className="text-sm">Unten</p>
        </div>
      </section>

      {/* Animations */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Animationen</h2>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs text-muted-foreground mb-4">Float-Up (neue Elemente)</p>
            <div className="float-up bg-primary/20 border border-primary/50 rounded p-3 text-center">
              Neue Benachrichtigung
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs text-muted-foreground mb-4">Pulse Ring (auf FAB/Buttons)</p>
            <div className="flex justify-center">
              <button className="rounded-full bg-primary text-white w-12 h-12 flex items-center justify-center pulse-ring hover:scale-110 transition">
                <Zap className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sidebar Style */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">Sidebar Items</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 hover:bg-secondary/50 transition sidebar-item cursor-pointer border-l-4 border-transparent flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Home (Hover für Scale)</span>
          </div>
          <div className="p-3 bg-secondary/50 sidebar-item-active border-l-4 border-primary flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Member (Active mit Glow-Bar)</span>
          </div>
          <div className="p-3 hover:bg-secondary/50 transition sidebar-item cursor-pointer border-l-4 border-transparent flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Statistik</span>
          </div>
        </div>
      </section>

      {/* CSS Variables Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4 fade-underline">CSS Variables</h2>
        <div className="bg-card border border-border rounded-lg p-6 space-y-2 font-mono text-xs">
          <p>
            <span className="text-primary">--accent-glow-sm</span>: 0 0 8px (feiner Glow)
          </p>
          <p>
            <span className="text-primary">--accent-glow</span>: 0 0 12px (standard)
          </p>
          <p>
            <span className="text-primary">--accent-glow-lg</span>: 0 0 20px (groß)
          </p>
          <p>
            <span className="text-primary">--accent-glow-xl</span>: 0 0 30px (extra groß)
          </p>
        </div>
      </section>

      {/* Implementation Notes */}
      <section className="bg-secondary/30 border border-border rounded-lg p-6">
        <h3 className="font-bold mb-3">📌 Implementierungs-Tipps</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            ✓ <strong>Cards:</strong> Füge <code className="bg-black/30 px-1 rounded">hud-card</code> zu bestehenden Card-Klassen hinzu
          </li>
          <li>
            ✓ <strong>Badges:</strong> Verwende <code className="bg-black/30 px-1 rounded">HUDStatusBadge</code> Komponente oder
            <code className="bg-black/30 px-1 rounded">hud-badge hud-badge-gold</code>
          </li>
          <li>
            ✓ <strong>Zahlen:</strong> Nutze <code className="bg-black/30 px-1 rounded">glow-text</code> oder
            <code className="bg-black/30 px-1 rounded">stat-glow</code>
          </li>
          <li>
            ✓ <strong>Online:</strong> <code className="bg-black/30 px-1 rounded">online-indicator</code> auf 6-8px Div
          </li>
          <li>✓ <strong>Alle Effekte sind CSS-only</strong> - keine JS-Animationen nötig</li>
          <li>✓ <strong>Performance:</strong> Nur Transforms, Opacity, Box-Shadow (GPU-beschleunigt)</li>
        </ul>
      </section>
    </div>
  );
};

export default HUDDesignReference;
