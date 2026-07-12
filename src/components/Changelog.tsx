import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Tag } from "lucide-react";

const STATIC_CHANGELOGS = [
  {
    id: "static-0-1",
    version: "0.1",
    title: "Basisstart und Login",
    description: "Grundlegende Anmeldung und Bewerberzugänge für ASD und Fluglizenz.",
    created_at: "2024-01-01T00:00:00.000Z",
    changes: [
      "Dienstnummer-Login mit Passwort",
      "ASD-Bewerber-Registrierung",
      "Fluglizenz-Bewerber-Registrierung",
      "Support-Dialog mit Discord-Kontakt auf der Login-Seite",
    ],
  },
  {
    id: "static-0-2",
    version: "0.2",
    title: "Startseite & Dashboard",
    description: "Überblick über Einsätze, Mitglieder und Lizenzinhaber.",
    created_at: "2024-01-02T00:00:00.000Z",
    changes: [
      "Startseiten-Dashboard mit Gesamt- und Tages-Einsatzzahlen",
      "Mitglieder-, Ausbilder- und Trial-Listen",
      "Fluglizenz-Inhaber-Statistik",
      "Dynamische Einsatz-Dialoge für heutige und alle Einsätze",
    ],
  },
  {
    id: "static-0-3",
    version: "0.3",
    title: "Einsatz- und Protokollmanagement",
    description: "Erstellen, ansehen und verwalten von Einsätzen und Einsatzprotokollen.",
    created_at: "2024-01-03T00:00:00.000Z",
    changes: [
      "Einsätze erfassen und speichern",
      "Einsatz-Protokolle anzeigen, filtern und löschen",
      "Protokoll-Schreiber bearbeiten",
      "Einsatzzahlen direkt im Dashboard einsehen",
    ],
  },
  {
    id: "static-0-4",
    version: "0.4",
    title: "Mitglieder, Familien & Statistik",
    description: "Mitgliederverwaltung, Familienverknüpfungen und leistungsstarke Statistiken.",
    created_at: "2024-01-04T00:00:00.000Z",
    changes: [
      "Mitgliederseite mit ASD-Beitrittsdaten",
      "Familienseite mit Verbindungen und Strukturen",
      "Wochen-, Monats- und Gesamtstatistiken",
      "Statistik-Reset und berechtigte Admin-Funktionen",
    ],
  },
  {
    id: "static-0-5",
    version: "0.5",
    title: "Fluglizenzen & Lizenz-Inhaber",
    description: "Verwaltung von Fluglizenzen und Übersicht über Lizenzinhaber.",
    created_at: "2024-01-05T00:00:00.000Z",
    changes: [
      "Fluglizenz-Erfassung mit Datum und Flugzeit",
      "Gültigkeitsprüfung und Lizenzstatus",
      "Lizenz-Inhaber-Seite für Rollenzuordnung und Übersicht",
    ],
  },
  {
    id: "static-0-6",
    version: "0.6",
    title: "Ausbilder- und Bewerberverwaltung",
    description: "Prüfungen, Trainings und Bewerberkontrolle für Ausbilder.",
    created_at: "2024-01-06T00:00:00.000Z",
    changes: [
      "Ausbilder-Dashboard für ASD- und Flugbewerber",
      "Prüfungs- und Fortschrittsübersicht",
      "Trainingseinheiten und Prüfungsfreigaben verwalten",
      "Ausbilder-Statistiken und Bewerberfilter",
    ],
  },
  {
    id: "static-0-7",
    version: "0.7",
    title: "Admin-Panel & Rollenrechte",
    description: "Systemweite Verwaltung, Rollensteuerung und Berechtigungen.",
    created_at: "2024-01-07T00:00:00.000Z",
    changes: [
      "Admin-Panel für Nutzer-, Rollen- und Rechteverwaltung",
      "Activity-Log und Audit-Tracking",
      "Navigation und Reihenfolge der Menüpunkte zentral steuern",
    ],
  },
  {
    id: "static-0-8",
    version: "0.8",
    title: "Erweiterte Inhalte & Mini-Spiele",
    description: "Zusätzliche Seiten, Spiele und Ausbildungsinhalte.",
    created_at: "2024-01-08T00:00:00.000Z",
    changes: [
      "10-80 Verfolgungsseite für Einsätze",
      "Achievements-Tracker und Belohnungssystem",
      "Gambling-, Roulette- und Minispiel-Inhalte",
      "Ortskunde mit versteckten Bereichen und Passwortschutz",
    ],
  },
  {
    id: "static-0-9",
    version: "0.9",
    title: "Profil, Support & Login-Erfahrung",
    description: "Persönliche Einstellungen, Hilfsfunktionen und bessere Anmeldung.",
    created_at: "2024-01-09T00:00:00.000Z",
    changes: [
      "Profilseite mit Passwortänderung und Discord-Einstellungen",
      "Responsive Login-Seite mit Slideshow-Hintergrund",
      "Hilfe-Dialog für doppelte Dienstnummern",
      "Direkte Navigation zu Profil und Abmeldung",
    ],
  },
  {
    id: "static-1-0",
    version: "1.0",
    title: "Search & Rescue, Übungen und Bewerber-Dashboards",
    description: "ASD- und Flug-Bewerber-Dashboards sowie spezielle Ausbildungsseiten.",
    created_at: "2024-01-10T00:00:00.000Z",
    changes: [
      "ASD-Bewerber-Dashboard mit Praxis- und Theorie-Status",
      "Fluglizenz-Bewerber-Dashboard und Fortschrittsanzeige",
      "Search & Rescue-Anmeldung und Trainingsseiten",
      "Übungsseite mit Kategorien für Flug, ASD, Schießen und Theorie",
    ],
  },
];

const Changelog = () => {
  const queryClient = useQueryClient();

  const { data: changelogs = [], isLoading } = useQuery({
    queryKey: ["changelogs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("changelogs")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const allChangelogs = [...STATIC_CHANGELOGS, ...changelogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  useEffect(() => {
    const channel = supabase
      .channel(`changelogs-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "changelogs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["changelogs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-card/60 border border-border rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Changelog</h3>
      </div>
      <ScrollArea className="h-[280px] pr-3">
        <div className="space-y-4">
          {allChangelogs.map((log) => (
            <div key={log.id} className="border-l-2 border-primary/30 pl-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  <Tag className="w-3 h-3" />
                  v{log.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleDateString("de-DE")}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">{log.title}</p>
              {log.description && (
                <p className="text-xs text-muted-foreground">{log.description}</p>
              )}
              <ul className="space-y-0.5">
                {(log.changes as Array<string | { text: string; type?: string }>)?.map((change, i) => {
                  const text = typeof change === "string" ? change : change?.text ?? "";
                  return (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Changelog;
