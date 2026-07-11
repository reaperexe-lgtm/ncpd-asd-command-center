/**
 * HUD DESIGN SYSTEM - IMPLEMENTIERUNGS-GUIDE FÜR BESTEHENDE KOMPONENTEN
 * 
 * Dieses Dokument zeigt, wie die neuen HUD-Utilities in bestehende Komponenten
 * integriert werden, ohne die Funktionalität zu verändern.
 * 
 * ============================================================================
 * STRATEGIE: "Nur CSS-Klassen hinzufügen, Layout-Struktur nicht ändern"
 * ============================================================================
 */

// ============================================================================
// BEISPIEL 1: Cards überall
// ============================================================================

// VORHER:
// <div className="bg-card border border-border rounded-lg p-5">
//   Card Content
// </div>

// NACHHER (Nur eine Klasse hinzugefügt):
// <div className="bg-card border border-border rounded-lg p-5 hud-card">
//   Card Content
// </div>

// ============================================================================
// BEISPIEL 2: Status Badges in Komponenten
// ============================================================================

// VORHER:
// <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
//   Aktiv
// </span>

// NACHHER mit HUDStatusBadge Komponente:
// import HUDStatusBadge from "@/components/HUDStatusBadge";
// <HUDStatusBadge label="Aktiv" variant="green" />

// ODER nur CSS-Klassen:
// <span className="hud-badge hud-badge-green">Aktiv</span>

// ============================================================================
// BEISPIEL 3: Rollen-Badges (z.B. in Member-Listen)
// ============================================================================

// VORHER in src/pages/MemberPage.tsx oder src/pages/Index.tsx:
// const roleColors = {
//   director: "text-amber-300",
//   ausbilder: "text-lime-400",
//   member: "text-primary",
// };

// NACHHER:
// import HUDStatusBadge from "@/components/HUDStatusBadge";
// 
// const roleBadges = {
//   director: { label: "Director", variant: "gold" as const },
//   ausbilder: { label: "Ausbilder", variant: "green" as const },
//   member: { label: "Member", variant: "blue" as const },
//   trial_member: { label: "Trial", variant: "red" as const },
// };
// 
// <HUDStatusBadge label={roleBadges[role].label} variant={roleBadges[role].variant} />

// ============================================================================
// BEISPIEL 4: Online-Indikatoren
// ============================================================================

// VORHER in src/components/OnlineUsersCard.tsx:
// <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
// <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />

// NACHHER (Viel einfacher):
// <div className="w-2.5 h-2.5 rounded-full online-indicator" />

// ============================================================================
// BEISPIEL 5: Große Zahlen/Statistiken
// ============================================================================

// VORHER in src/pages/StatistikPage.tsx:
// <p className="text-4xl font-black text-primary tabular-nums">{value}</p>

// NACHHER (mit Glow):
// <div className="stat-glow">{value}</div>

// ODER mit kleinerer Variante:
// <p className="glow-text-large">{value}</p>

// ============================================================================
// BEISPIEL 6: Navigations-Items in Sidebar
// ============================================================================

// VORHER in src/components/AppSidebar.tsx:
// <SidebarMenuButton asChild isActive={isActive}>
//   <NavLink to={path}>
//     {icon && <component.icon className="w-4 h-4" />}
//     {label}
//   </NavLink>
// </SidebarMenuButton>

// NACHHER: Zusätzliche Klasse auf das Button-Element:
// <SidebarMenuButton 
//   asChild 
//   isActive={isActive}
//   className={isActive ? "sidebar-item-active" : "sidebar-item"}
// >
//   <NavLink to={path}>
//     {icon && <component.icon className="w-4 h-4" />}
//     {label}
//   </NavLink>
// </SidebarMenuButton>

// ============================================================================
// BEISPIEL 7: FAB Button (+ Button oben rechts)
// ============================================================================

// VORHER in src/components/QuickActionFAB.tsx:
// <Button className="fixed bottom-6 right-6 rounded-full w-14 h-14">
//   <Plus className="w-6 h-6" />
// </Button>

// NACHHER:
// <Button className="fixed bottom-6 right-6 rounded-full w-14 h-14 pulse-ring">
//   <Plus className="w-6 h-6" />
// </Button>

// ============================================================================
// BEISPIEL 8: Dialog/Modal Overlays
// ============================================================================

// VORHER in src/pages/Index.tsx:
// <DialogContent className="max-w-[70vw] sm:max-w-sm p-1 bg-black">
//   <video src="..." />
// </DialogContent>

// NACHHER (wenn z.B. Vignette oder Ken-Burns erforderlich):
// <DialogContent className="max-w-[70vw] sm:max-w-sm p-1 bg-black vignette">
//   <video src="..." />
// </DialogContent>

// ============================================================================
// BEISPIEL 9: Live-Event-Badges
// ============================================================================

// VORHER:
// <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
//   Live
// </span>

// NACHHER:
// <span className="live-badge">Einsatz Aktiv</span>

// ============================================================================
// BEISPIEL 10: Trennlinien in Cards
// ============================================================================

// VORHER:
// <div className="border-t border-border/30" />

// NACHHER:
// <div className="hud-divider" />

// ============================================================================
// WICHTIGE NOTIZEN
// ============================================================================

/**
 * ✓ NICHT: Bestehende Struktur verändern
 * ✓ JA: Einfach CSS-Klassen hinzufügen
 * 
 * ✓ NICHT: Tailwind-Klassen überschreiben
 * ✓ JA: HUD-Klassen mit bestehenden kombinieren
 * 
 * ✓ NICHT: Neue Dependencies hinzufügen
 * ✓ JA: Reine CSS-Utilities nutzen
 * 
 * ✓ NICHT: Große Refactoring-Sessions
 * ✓ JA: Schrittweise Komponenten anpassen
 * 
 * Die HUD-Klassen wirken sich sofort auf alle bestehenden Komponenten aus,
 * sobald sie hinzugefügt werden - kein großer Rollout erforderlich.
 */

export {};
