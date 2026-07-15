import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Save, Loader2 } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/supabaseFunctions";

interface HeliEmbedRow {
  id: string;
  channel_id: string;
  embed_json: any;
  discord_message_id: string | null;
  updated_at: string;
}

export default function HeliEmbedsSection() {
  const [rows, setRows] = useState<HeliEmbedRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, "save" | "send" | null>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("heli_data_embeds" as any)
      .select("*")
      .order("id");
    if (error) {
      toast.error("Konnte Heli-Embeds nicht laden");
    } else {
      const list = (data ?? []) as unknown as HeliEmbedRow[];
      setRows(list);
      const d: Record<string, string> = {};
      list.forEach((r) => (d[r.id] = JSON.stringify(r.embed_json, null, 2)));
      setDrafts(d);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRow = async (row: HeliEmbedRow) => {
    let parsed: any;
    try { parsed = JSON.parse(drafts[row.id] || ""); }
    catch { toast.error("Ungültiges JSON"); return; }
    setBusy((b) => ({ ...b, [row.id]: "save" }));
    const { error } = await supabase
      .from("heli_data_embeds" as any)
      .update({ embed_json: parsed })
      .eq("id", row.id);
    setBusy((b) => ({ ...b, [row.id]: null }));
    if (error) { toast.error("Speichern fehlgeschlagen: " + error.message); return; }
    toast.success("Embed gespeichert");
    await load();
  };

  const sendRow = async (row: HeliEmbedRow) => {
    // save first if draft differs
    try {
      const parsed = JSON.parse(drafts[row.id] || "");
      if (JSON.stringify(parsed) !== JSON.stringify(row.embed_json)) {
        const { error } = await supabase
          .from("heli_data_embeds" as any)
          .update({ embed_json: parsed })
          .eq("id", row.id);
        if (error) throw error;
      }
    } catch (e) {
      toast.error("Ungültiges JSON – bitte prüfen");
      return;
    }
    setBusy((b) => ({ ...b, [row.id]: "send" }));
    try {
      await invokeEdgeFunction(supabase, "discord-send-heli-embeds", { id: row.id });
      toast.success(row.discord_message_id ? "Discord-Nachricht aktualisiert" : "Discord-Nachricht gesendet");
      await load();
    } catch (e) {
      toast.error("Discord-Fehler: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy((b) => ({ ...b, [row.id]: null }));
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Lade Heli-Datenblätter...</div>;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <Send className="w-4 h-4" /> Heli-Datenblätter (Discord)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Embed-JSON bearbeiten und per Bot in den Discord-Channel senden oder aktualisieren.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="border border-border rounded-md p-3 space-y-2 bg-background/40">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs">
                <span className="font-mono font-semibold text-primary">{row.id}</span>
                <span className="text-muted-foreground"> · Channel {row.channel_id}</span>
                {row.discord_message_id ? (
                  <span className="text-emerald-500"> · Msg {row.discord_message_id}</span>
                ) : (
                  <span className="text-yellow-500"> · noch nicht gesendet</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveRow(row)}
                  disabled={busy[row.id] === "save"}
                  className="h-8 text-xs gap-1.5"
                >
                  {busy[row.id] === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Speichern
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendRow(row)}
                  disabled={busy[row.id] === "send"}
                  className="h-8 text-xs gap-1.5"
                >
                  {busy[row.id] === "send" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {row.discord_message_id ? "Aktualisieren" : "Senden"}
                </Button>
              </div>
            </div>
            <Textarea
              value={drafts[row.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
              rows={14}
              className="font-mono text-xs bg-background border-border"
              spellCheck={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
