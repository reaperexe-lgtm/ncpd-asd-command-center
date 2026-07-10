import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Tag } from "lucide-react";

type ChangelogEntry = {
  id: string;
  version: string;
  created_at: string;
  title: string;
  description?: string;
  changes?: Array<string | { text: string; type?: string }>;
};

const DEFAULT_CHANGELOGS: ChangelogEntry[] = [
  {
    id: "welcome",
    version: "1.2.0",
    created_at: "2026-07-11T00:00:00.000Z",
    title: "Schönere Startseite",
    description: "Die Login-Seite wirkt jetzt klarer, ruhiger und einfacher im Einstieg.",
    changes: [
      "Kurzüberblick mit den wichtigsten Neuerungen",
      "Saubere Darstellung für Desktop und Handy",
      "Mehr Fokus auf den schnellen Einstieg in die App",
    ],
  },
  {
    id: "speed",
    version: "1.1.9",
    created_at: "2026-07-08T00:00:00.000Z",
    title: "Schnellerer Einstieg",
    description: "Wichtige Funktionen sind jetzt noch einfacher zu finden.",
    changes: [
      "Bessere Orientierung direkt nach dem Login",
      "Kürzere Wege zu den wichtigsten Bereichen",
      "Komfortableres Arbeiten im Alltag",
    ],
  },
  {
    id: "quality",
    version: "1.1.8",
    created_at: "2026-07-03T00:00:00.000Z",
    title: "Feinere Details",
    description: "Kleine Verbesserungen für ein angenehmeres Gefühl in der Nutzung.",
    changes: [
      "Optimierte Darstellung von Infos und Status",
      "Mehr Konsistenz in Buttons und Karten",
      "Weniger Ablenkung bei der Nutzung",
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

  const visibleChangelogs = (changelogs && changelogs.length > 0 ? changelogs : DEFAULT_CHANGELOGS) as ChangelogEntry[];

  return (
    <div className="bg-card/60 border border-border rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Changelog</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Kurze Neuigkeiten und Verbesserungen für einen angenehmeren Start.
      </p>
      <ScrollArea className="h-[280px] pr-3">
        <div className="space-y-4">
          {visibleChangelogs.map((log) => (
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
