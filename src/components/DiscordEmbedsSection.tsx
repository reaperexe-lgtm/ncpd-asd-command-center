import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Save, MessageSquare } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/supabaseFunctions";

interface DiscordEmbedRow {
  id: string;
  label: string;
  channel_id: string;
  embeds: any[];
  discord_message_id: string | null;
  updated_at: string;
}

export default function DiscordEmbedsSection() {
  const [rows, setRows] = useState<DiscordEmbedRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, "save" | "send" | null>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discord_embeds" as any)
      .select("*")
      .order("id");
    if (error) {
      toast.error("Konnte Discord-Embeds nicht laden");
    } else {
      const list = (data ?? []) as unknown as DiscordEmbedRow[];
      setRows(list);
      const d: Record<string, string> = {};
      list.forEach((r) => {
        d[r.id] = JSON.stringify(r.embeds, null, 2);
      });
      setDrafts(d);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const parseDraft = (rowId: string): any[] | null => {
    try {
      const parsed = JSON.parse(drafts[rowId] || "[]");
      if (!Array.isArray(parsed)) {
        toast.error("Das JSON muss ein Array von Embeds sein (z.B. [ { ... }, { ... } ])");
        return null;
      }
      return parsed;
    } catch {
      toast.error("Ungültiges JSON – bitte prüfen");
      return null;
    }
  };

  const saveRow = async (row: DiscordEmbedRow) => {
    const parsed = parseDraft(row.id);
    if (!parsed) return;
    setBusy((b) => ({ ...b, [row.id]: "save" }));
    const { error } = await supabase
      .from("discord_embeds" as any)
      .update({ embeds: parsed })
      .eq("id", row.id);
    setBusy((b) => ({ ...b, [row.id]: null }));
    if (error) { toast.error("Speichern fehlgeschlagen: " + error.message); return; }
    toast.success("Embeds gespeichert");
    await load();
  };

  const sendRow = async (row: DiscordEmbedRow) => {
    const parsed = parseDraft(row.id);
    if (!parsed) return;
    if (JSON.stringify(parsed) !== JSON.stringify(row.embeds)) {
      const { error } = await supabase
        .from("discord_embeds" as any)
        .update({ embeds: parsed })
        .eq("id", row.id);
      if (error) { toast.error("Speichern fehlgeschlagen: " + error.message); return; }
    }
    setBusy((b) => ({ ...b, [row.id]: "send" }));
    try {
      await invokeEdgeFunction(supabase, "discord-send-embeds", { id: row.id });
      toast.success(row.discord_message_id ? "Discord-Nachricht aktualisiert" : "Discord-Nachricht gesendet");
      await load();
    } catch (e) {
      toast.error("Discord-Fehler: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy((b) => ({ ...b, [row.id]: null }));
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Lade Discord-Embeds...</div>;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Discord-Embeds (Regelwerke & Ankündigungen)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Mehrteilige Embed-Nachrichten bearbeiten und per Bot in den jeweiligen Channel senden oder aktualisieren.
          Beim erneuten Senden wird die bestehende Nachricht im Channel aktualisiert statt doppelt gepostet.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const isSent = !!row.discord_message_id;
          return (
            <div key={row.id} className="border border-border rounded-md p-3 space-y-3 bg-background/40">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-semibold text-primary">{row.label}</span>
                  <span className="font-mono text-muted-foreground">{row.id}</span>
                  <span className="text-muted-foreground">Channel {row.channel_id}</span>
                  {isSent ? (
                    <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/40 shadow-none hover:bg-emerald-600/20">
                      gesendet
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-none hover:bg-amber-500/15">
                      noch nicht gesendet
                    </Badge>
                  )}
                </div>
              </div>

              <Textarea
                value={drafts[row.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                rows={16}
                className="font-mono text-xs bg-background border-border"
              />

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveRow(row)}
                  disabled={busy[row.id] === "save"}
                  className="gap-1.5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Speichern
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendRow(row)}
                  disabled={busy[row.id] === "send"}
                  className="gap-1.5 text-xs"
                >
                  <Send className="w-3.5 h-3.5" /> {isSent ? "Aktualisieren" : "Senden"}
                </Button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Noch keine Discord-Embeds angelegt</p>
        )}
      </div>
    </div>
  );
}
