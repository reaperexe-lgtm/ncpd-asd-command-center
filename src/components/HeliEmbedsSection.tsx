import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Save, Loader2, Plus, X, Image as ImageIcon, Code2, LayoutList } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/supabaseFunctions";
import { applyHeliEmbedImageBinding } from "@/lib/heliEmbedImageMap";

interface HeliEmbedRow {
  id: string;
  channel_id: string;
  embed_json: any;
  discord_message_id: string | null;
  updated_at: string;
}

interface EmbedField {
  name: string;
  value: string;
}

interface StructuredEmbed {
  title: string;
  color: string; // hex, e.g. "#22c55e"
  imageUrl: string;
  fields: EmbedField[];
}

const DEFAULT_COLOR = "#22c55e";

function decimalToHex(value: unknown): string {
  const num = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num) || num < 0) return DEFAULT_COLOR;
  return "#" + Math.min(num, 0xffffff).toString(16).padStart(6, "0");
}

function hexToDecimal(hex: string): number {
  const clean = hex.replace("#", "").trim();
  const parsed = parseInt(clean || "22c55e", 16);
  return Number.isFinite(parsed) ? parsed : 0x22c55e;
}

function toStructured(embedJson: any): StructuredEmbed {
  return {
    title: embedJson?.title ?? "",
    color: decimalToHex(embedJson?.color),
    imageUrl: embedJson?.image?.url ?? "",
    fields: Array.isArray(embedJson?.fields)
      ? embedJson.fields.map((f: any) => ({ name: f?.name ?? "", value: f?.value ?? "" }))
      : [],
  };
}

function withBoundImage(rowId: string, embedJson: any): any {
  const bound = applyHeliEmbedImageBinding(embedJson, rowId);
  return bound ?? embedJson;
}

function fromStructured(s: StructuredEmbed): any {
  const json: any = {
    title: s.title,
    color: hexToDecimal(s.color),
    fields: s.fields
      .filter((f) => f.name.trim() !== "" || f.value.trim() !== "")
      .map((f) => ({ name: f.name, value: f.value })),
  };
  if (s.imageUrl.trim() !== "") {
    json.image = { url: s.imageUrl.trim() };
  }
  return json;
}

export default function HeliEmbedsSection() {
  const [rows, setRows] = useState<HeliEmbedRow[]>([]);
  const [structured, setStructured] = useState<Record<string, StructuredEmbed>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [advancedMode, setAdvancedMode] = useState<Record<string, boolean>>({});
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
      const s: Record<string, StructuredEmbed> = {};
      list.forEach((r) => {
        const boundEmbed = withBoundImage(r.id, r.embed_json);
        d[r.id] = JSON.stringify(boundEmbed, null, 2);
        s[r.id] = toStructured(boundEmbed);
      });
      setDrafts(d);
      setStructured(s);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Builds the embed JSON that should actually be persisted / sent for a row,
  // respecting whichever mode (form vs. raw JSON) is currently active.
  const resolveEmbedJson = (rowId: string): any | null => {
    if (advancedMode[rowId]) {
      try {
        return JSON.parse(drafts[rowId] || "");
      } catch {
        toast.error("Ungültiges JSON – bitte prüfen");
        return null;
      }
    }
    const s = structured[rowId];
    if (!s) return null;
    return withBoundImage(rowId, fromStructured(s));
  };

  const updateField = (rowId: string, index: number, patch: Partial<EmbedField>) => {
    setStructured((prev) => {
      const current = prev[rowId];
      if (!current) return prev;
      const fields = current.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
      return { ...prev, [rowId]: { ...current, fields } };
    });
  };

  const addField = (rowId: string) => {
    setStructured((prev) => {
      const current = prev[rowId];
      if (!current) return prev;
      return { ...prev, [rowId]: { ...current, fields: [...current.fields, { name: "", value: "" }] } };
    });
  };

  const removeField = (rowId: string, index: number) => {
    setStructured((prev) => {
      const current = prev[rowId];
      if (!current) return prev;
      return { ...prev, [rowId]: { ...current, fields: current.fields.filter((_, i) => i !== index) } };
    });
  };

  const toggleAdvanced = (rowId: string) => {
    const goingToAdvanced = !advancedMode[rowId];
    if (goingToAdvanced) {
      // Structured -> JSON: serialize the current form state into the draft.
      const s = structured[rowId];
      if (s) setDrafts((d) => ({ ...d, [rowId]: JSON.stringify(fromStructured(s), null, 2) }));
    } else {
      // JSON -> Structured: try to parse the draft back into form fields.
      try {
        const parsed = JSON.parse(drafts[rowId] || "");
        setStructured((s) => ({ ...s, [rowId]: toStructured(parsed) }));
      } catch {
        toast.error("Ungültiges JSON – kann nicht ins Formular übernommen werden");
        return;
      }
    }
    setAdvancedMode((m) => ({ ...m, [rowId]: goingToAdvanced }));
  };

  const saveRow = async (row: HeliEmbedRow) => {
    const parsed = resolveEmbedJson(row.id);
    if (!parsed) return;
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
    const parsed = resolveEmbedJson(row.id);
    if (!parsed) return;
    if (JSON.stringify(parsed) !== JSON.stringify(row.embed_json)) {
      const { error } = await supabase
        .from("heli_data_embeds" as any)
        .update({ embed_json: parsed })
        .eq("id", row.id);
      if (error) { toast.error("Speichern fehlgeschlagen: " + error.message); return; }
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
          Datenblatt bearbeiten und per Bot in den Discord-Channel senden oder aktualisieren.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const s = structured[row.id];
          const isAdvanced = !!advancedMode[row.id];
          const isSent = !!row.discord_message_id;

          return (
            <div key={row.id} className="border border-border rounded-md p-3 space-y-3 bg-background/40">
              {/* Header: id, channel, status, mode toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-mono font-semibold text-primary">{row.id}</span>
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleAdvanced(row.id)}
                  className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {isAdvanced ? <LayoutList className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                  {isAdvanced ? "Formular" : "JSON"}
                </Button>
              </div>

              {isAdvanced ? (
                <Textarea
                  value={drafts[row.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                  rows={14}
                  className="font-mono text-xs bg-background border-border"
                  spellCheck={false}
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  {/* Structured form */}
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Titel</label>
                        <Input
                          value={s?.title ?? ""}
                          onChange={(e) =>
                            setStructured((prev) => ({ ...prev, [row.id]: { ...prev[row.id], title: e.target.value } }))
                          }
                          className="bg-background border-border text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Farbe</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={s?.color ?? DEFAULT_COLOR}
                            onChange={(e) =>
                              setStructured((prev) => ({ ...prev, [row.id]: { ...prev[row.id], color: e.target.value } }))
                            }
                            className="h-9 w-10 rounded border border-border bg-background cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3" /> Bild-URL
                      </label>
                      <Input
                        value={s?.imageUrl ?? ""}
                        onChange={(e) =>
                          setStructured((prev) => ({ ...prev, [row.id]: { ...prev[row.id], imageUrl: e.target.value } }))
                        }
                        placeholder="https://... (später ergänzen)"
                        className="bg-background border-border text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-muted-foreground">Felder</label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addField(row.id)}
                          className="h-6 text-[11px] gap-1 px-2"
                        >
                          <Plus className="w-3 h-3" /> Feld
                        </Button>
                      </div>
                      {(s?.fields ?? []).map((f, i) => (
                        <div key={i} className="border border-border/70 rounded-md p-2 space-y-1.5 bg-card/40">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={f.name}
                              onChange={(e) => updateField(row.id, i, { name: e.target.value })}
                              placeholder="Feldname (z. B. Top Speed)"
                              className="bg-background border-border text-xs h-7"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeField(row.id, i)}
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <Textarea
                            value={f.value}
                            onChange={(e) => updateField(row.id, i, { value: e.target.value })}
                            placeholder="Inhalt"
                            rows={2}
                            className="bg-background border-border text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Discord-style preview */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Vorschau</span>
                    <div className="bg-[#313338] rounded-md p-3 font-sans">
                      <div
                        className="rounded-[3px] pl-3 py-2 pr-3 max-w-full"
                        style={{
                          backgroundColor: "#2b2d31",
                          borderLeft: `4px solid ${s?.color ?? DEFAULT_COLOR}`,
                        }}
                      >
                        {s?.title && (
                          <div className="text-[#f2f3f5] font-semibold text-sm mb-2 leading-snug">{s.title}</div>
                        )}
                        <div className="grid grid-cols-1 gap-y-1.5">
                          {(s?.fields ?? [])
                            .filter((f) => f.name.trim() || f.value.trim())
                            .map((f, i) => (
                              <div key={i}>
                                <div className="text-[#f2f3f5] font-semibold text-xs">{f.name || "\u00A0"}</div>
                                <div className="text-[#dbdee1] text-xs whitespace-pre-wrap leading-snug">{f.value}</div>
                              </div>
                            ))}
                        </div>
                        {s?.imageUrl?.trim() ? (
                          <img
                            src={s.imageUrl}
                            alt="Embed-Vorschau"
                            className="mt-2 rounded-[4px] max-w-full max-h-40 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="mt-2 rounded-[4px] border border-dashed border-white/10 text-[10px] text-[#949ba4] text-center py-3">
                            Kein Bild hinterlegt
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
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
                  {isSent ? "Aktualisieren" : "Senden"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
