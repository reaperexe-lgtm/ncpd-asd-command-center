export type SrModule = { code: string; label: string; detail?: string };
export type SrSection = { title: string; modules: SrModule[] };
export type SrStage = { id: string; title: string; subtitle?: string; sections: SrSection[] };

export const SR_CURRICULUM: SrStage[] = [
  {
    id: "stage-1",
    title: "Stufe 1 – SR Spezialisierung",
    subtitle: "Menschenbergung (Air Rescue)",
    sections: [
      {
        title: "1.1 Trainingsinhalte",
        modules: [
          { code: "1.1.a", label: "Stabilisierung im Schwebeflug über Person (20 sek)", detail: "MazeBank" },
          { code: "1.1.b", label: "Winch-/Rettungsablass-Simulation" },
          { code: "1.1.c", label: "Absetzen von SR-Personal" },
          { code: "1.1.d", label: "Abholung verletzter Personen" },
          { code: "1.1.e", label: "Kommunikation Pilot ↔ SR" },
        ],
      },
      {
        title: "1.2 Bewertungsphase",
        modules: [
          { code: "1.2.a", label: "Stabiler Schwebeflug über bewegliche Ziele" },
          { code: "1.2.b", label: "Erfolgreiche simulierte Personenaufnahme" },
          { code: "1.2.c", label: "Sicheres Einhalten von PR-Anflugprofilen" },
        ],
      },
    ],
  },
  {
    id: "stage-2",
    title: "Stufe 2 – SR Urban Operations",
    subtitle: "Haus- & Dachlandungen",
    sections: [
      {
        title: "2.1 Theorie",
        modules: [
          { code: "2.1.a", label: "Gebäudestruktur & statische Gefahren" },
          { code: "2.1.b", label: "Rotorradius & Hinderniserkennung" },
          { code: "2.1.c", label: "Sicherheitszonen (Hot/Warm/Safe Zone)" },
          { code: "2.1.d", label: "Aufsetzpunkte analysieren" },
        ],
      },
      {
        title: "2.2 Praktische Übungen",
        modules: [
          { code: "2.2.a", label: "Niedrige Gebäude (8021 DailyGlobe) – Fahrzeuge vermeiden, Personenabsicherung" },
          { code: "2.2.b", label: "Mittlere Dachflächen (7274 RPD) – Zugangs- & Absetzpunkte" },
          { code: "2.2.c", label: "Schwierige / enge Dachlandungen (RP Nordseite) – Antennen, Klimaanlagen" },
          { code: "2.2.d", label: "Night Ops (Schmuggler Flughafen) – Silent-Approach-Kurve" },
        ],
      },
      {
        title: "2.3 Trainingsinhalte – enge Zonen",
        modules: [
          { code: "2.3.a", label: "Schlucht – 997/998 Roxwood" },
          { code: "2.3.b", label: "Wald – 1100 / 1099" },
          { code: "2.3.c", label: "Gebirge – 1098" },
          { code: "2.3.d", label: "Gebäude – Roxwood 960" },
        ],
      },
    ],
  },
  {
    id: "stage-3",
    title: "Stufe 3 – Abschlussprüfung SR",
    subtitle: "Bestehen = Rangvergabe „ASD-SR\"",
    sections: [
      {
        title: "3.1 Theoretischer Test",
        modules: [
          { code: "3.1.a", label: "Flugphysik" },
          { code: "3.1.b", label: "Sicherheitsregeln" },
          { code: "3.1.c", label: "Einsatzverfahren" },
          { code: "3.1.d", label: "SR-SOPs" },
        ],
      },
      {
        title: "3.2 Praktische Prüfung – Teil A: Menschenbergung",
        modules: [
          { code: "3.2.a", label: "Anflug enges Gebiet (Mount Chiliad)" },
          { code: "3.2.b", label: "Stabiler Schwebeflug ≥ 20 Sek (Maze Bank Tower)" },
          { code: "3.2.c", label: "Erfolgreiche Bergung einer Person" },
        ],
      },
      {
        title: "3.3 Praktische Prüfung – Teil B: Haus-/Dachlandung",
        modules: [
          { code: "3.3.a", label: "Scheune Orangenfeld (1009/1007) – Wahl Landeplatz" },
          { code: "3.3.b", label: "Landung ohne Heckrotor-Bodenberührung" },
          { code: "3.3.c", label: "Kontrolliertes Absetzen & Aufnahme von Personal" },
        ],
      },
      {
        title: "3.4 Einsatzsimulation",
        modules: [
          { code: "3.4.a", label: "Eileinsatz aufnehmen" },
          { code: "3.4.b", label: "Lagebeurteilung" },
          { code: "3.4.c", label: "Bergung" },
          { code: "3.4.d", label: "Transport & Übergabe" },
        ],
      },
    ],
  },
];

export const SR_ROLES = [
  { role: "SR-Pilot", desc: "Spezialisierter Helikopterpilot für Search & Rescue, urbane Landungen und medizinische Luftunterstützung." },
  { role: "SR-Medic", desc: "Medizinisches Personal, das mit dem Helikopter abgesetzt und geborgen wird (RPlich mit Erstversorgung ausgespielt)." },
  { role: "SR-Spotter", desc: "Unterstützt den Pilot bei Sicht, Umgebung, Hindernissen, Funk und Gefahrenanalyse." },
];

export function allModuleCodes(): string[] {
  return SR_CURRICULUM.flatMap((s) => s.sections.flatMap((sec) => sec.modules.map((m) => m.code)));
}
