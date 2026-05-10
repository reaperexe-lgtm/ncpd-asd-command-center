import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Plus, Trash2, Check, X, HelpCircle, Bell } from "lucide-react";
import { logActivity } from "@/lib/activityLog";

const KATEGORIEN = ["Flugübung", "ASD-Training", "Schießen", "Verfolgung", "Theorie", "Sonstiges"];

type Uebung = {
  id: string;
  titel: string;
  beschreibung: string | null;
  ort: string | null;
  kategorie: string;
  start_at: string;
  max_teilnehmer: number | null;
  created_by: string;
  status: string;
  creator_name?: string;
};

type Teilnahme = {
  id: string;
  uebung_id: string;
  user_id: string;
  status: "zusage" | "absage" | "vielleicht";
  user_name?: string;
};

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  zusage: { label: "Zusage", color: "bg-primary/20 text-primary border-primary/40", icon: Check },
  absage: { label: "Absage", color: "bg-destructive/20 text-destructive border-destructive/40", icon: X },
  vielleicht: { label: "Vielleicht", color: "bg-muted text-muted-foreground border-border", icon: HelpCircle },
};

export default function UebungenPage() {
  const { user, profile, role } = useAuth();
  const canCreate = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "team_red"].includes(role || "");
  const isAdmin = ["admin", "director", "co_director", "supervisor", "team_red"].includes(role || "");

  const [uebungen, setUebungen] = useState<Uebung[]>([]);
  const [teilnahmen, setTeilnahmen] = useState<Teilnahme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Form state
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [ort, setOrt] = useState("");
  const [kategorie, setKategorie] = useState("Sonstiges");
  const [startAt, setStartAt] = useState("");
  const [maxTeilnehmer, setMaxTeilnehmer] = useState("");
  const [notifyDiscord, setNotifyDiscord] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: ueb }, { data: tn }] = await Promise.all([
      supabase.from("uebungen").select("*").order("start_at", { ascending: true }),
      supabase.from("uebung_teilnahmen").select("*"),
    ]);
    if (ueb) {
      const creatorIds = [...new Set(ueb.map((u: any) => u.created_by))];
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", creatorIds);
      const nameMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p.name]));
      setUebungen(ueb.map((u: any) => ({ ...u, creator_name: nameMap[u.created_by] || "Unbekannt" })));
    }
    if (tn) {
      const userIds = [...new Set(tn.map((t: any) => t.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", userIds);
      const nameMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p.name]));
      setTeilnahmen(tn.map((t: any) => ({ ...t, user_name: nameMap[t.user_id] || "Unbekannt" })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("uebungen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "uebungen" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "uebung_teilnahmen" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setTitel(""); setBeschreibung(""); setOrt(""); setKategorie("Sonstiges");
    setStartAt(""); setMaxTeilnehmer(""); setNotifyDiscord(true);
  };

  const handleCreate = async () => {
    if (!user || !titel.trim() || !startAt) {
      toast.error("Bitte Titel und Datum/Uhrzeit ausfüllen");
      return;
    }
    setSubmitting(true);
    const payload = {
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || null,
      ort: ort.trim() || null,
      kategorie,
      start_at: new Date(startAt).toISOString(),
      max_teilnehmer: maxTeilnehmer ? parseInt(maxTeilnehmer) : null,
      created_by: user.id,
    };
    const { data, error } = await supabase.from("uebungen").insert(payload).select().single();
    if (error) {
      toast.error("Fehler beim Erstellen: " + error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Übung erstellt!");
    await logActivity("uebung_created", "general", { titel: payload.titel, start_at: payload.start_at });

    if (notifyDiscord) {
      try {
        const { data: notifyResult, error: notifyError } = await supabase.functions.invoke("discord-notify", {
          body: {
            type: "uebung_announcement",
            data: { ...payload, created_by_name: profile?.name },
          },
        });

        if (notifyError || notifyResult?.success === false) {
          const message = notifyError?.message || notifyResult?.error || "Discord-Notification fehlgeschlagen";
          toast.error(message);
        } else {
          toast.success("Discord-Ankündigung gesendet");
        }
      } catch (e: any) {
        toast.error(e?.message || "Discord-Notification fehlgeschlagen");
      }
    }

    resetForm();
    setDialogOpen(false);
    setSubmitting(false);
    fetchAll();
  };

  const handleRsvp = async (uebungId: string, status: "zusage" | "absage" | "vielleicht") => {
    if (!user) return;
    const existing = teilnahmen.find((t) => t.uebung_id === uebungId && t.user_id === user.id);
    if (existing) {
      const { error } = await supabase.from("uebung_teilnahmen").update({ status }).eq("id", existing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("uebung_teilnahmen").insert({ uebung_id: uebungId, user_id: user.id, status });
      if (error) toast.error(error.message);
    }
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Übung wirklich löschen?")) return;
    const { error } = await supabase.from("uebungen").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Gelöscht");
      fetchAll();
    }
  };

  const now = Date.now();
  const filtered = useMemo(() => {
    return uebungen.filter((u) => {
      const isPast = new Date(u.start_at).getTime() < now;
      return showPast ? isPast : !isPast;
    });
  }, [uebungen, showPast, now]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Calendar className="w-8 h-8" /> Übungen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Übungen ankündigen, beitreten und Anwesenheit verfolgen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showPast ? "default" : "outline"}
            onClick={() => setShowPast(!showPast)}
            size="sm"
          >
            {showPast ? "Kommende Übungen" : "Vergangene anzeigen"}
          </Button>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Neue Übung
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Neue Übung ankündigen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Titel *</Label>
                    <Input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z.B. Formationsflug Übung" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Datum & Uhrzeit *</Label>
                      <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                    </div>
                    <div>
                      <Label>Kategorie</Label>
                      <Select value={kategorie} onValueChange={setKategorie}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KATEGORIEN.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Ort</Label>
                      <Input value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="z.B. DACH PD" />
                    </div>
                    <div>
                      <Label>Max. Teilnehmer</Label>
                      <Input type="number" min="1" value={maxTeilnehmer} onChange={(e) => setMaxTeilnehmer(e.target.value)} placeholder="leer = unbegrenzt" />
                    </div>
                  </div>
                  <div>
                    <Label>Beschreibung</Label>
                    <Textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={3} placeholder="Details zur Übung..." />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={notifyDiscord} onChange={(e) => setNotifyDiscord(e.target.checked)} />
                    <Bell className="w-4 h-4" /> Im Discord ankündigen
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? "Wird erstellt..." : "Erstellen"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Laden...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {showPast ? "Keine vergangenen Übungen." : "Keine geplanten Übungen."}
            {canCreate && !showPast && " Erstelle die erste!"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((u) => {
            const tns = teilnahmen.filter((t) => t.uebung_id === u.id);
            const zusagen = tns.filter((t) => t.status === "zusage");
            const absagen = tns.filter((t) => t.status === "absage");
            const vielleicht = tns.filter((t) => t.status === "vielleicht");
            const myStatus = tns.find((t) => t.user_id === user?.id)?.status;
            const isFull = u.max_teilnehmer && zusagen.length >= u.max_teilnehmer && myStatus !== "zusage";
            const canDelete = u.created_by === user?.id || isAdmin;
            const startDate = new Date(u.start_at);
            const isPast = startDate.getTime() < now;

            return (
              <Card key={u.id} className={isPast ? "opacity-70" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{u.kategorie}</Badge>
                        {isPast && <Badge variant="outline">Vergangen</Badge>}
                      </div>
                      <CardTitle className="mt-2 text-xl">{u.titel}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">von {u.creator_name}</p>
                    </div>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    {startDate.toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })}
                  </div>
                  {u.ort && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" /> {u.ort}
                    </div>
                  )}
                  {u.beschreibung && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{u.beschreibung}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary" />
                    <span>
                      <strong>{zusagen.length}</strong>
                      {u.max_teilnehmer ? ` / ${u.max_teilnehmer}` : ""} Zusagen
                      {vielleicht.length > 0 && `, ${vielleicht.length} vielleicht`}
                      {absagen.length > 0 && `, ${absagen.length} Absagen`}
                    </span>
                  </div>

                  {(zusagen.length > 0 || vielleicht.length > 0 || absagen.length > 0) && (
                    <div className="space-y-1.5 text-xs border-t border-border pt-2">
                      {zusagen.length > 0 && (
                        <div><span className="text-primary font-semibold">✓ Zusagen:</span> {zusagen.map(t => t.user_name).join(", ")}</div>
                      )}
                      {vielleicht.length > 0 && (
                        <div><span className="text-muted-foreground font-semibold">? Vielleicht:</span> {vielleicht.map(t => t.user_name).join(", ")}</div>
                      )}
                      {absagen.length > 0 && (
                        <div><span className="text-destructive font-semibold">✗ Absagen:</span> {absagen.map(t => t.user_name).join(", ")}</div>
                      )}
                    </div>
                  )}

                  {!isPast && (
                    <div className="flex gap-2 pt-2">
                      {(["zusage", "vielleicht", "absage"] as const).map((s) => {
                        const meta = STATUS_META[s];
                        const Icon = meta.icon;
                        const active = myStatus === s;
                        const disabled = s === "zusage" && isFull;
                        return (
                          <Button
                            key={s}
                            size="sm"
                            variant={active ? "default" : "outline"}
                            onClick={() => handleRsvp(u.id, s)}
                            disabled={disabled}
                            className="flex-1"
                          >
                            <Icon className="w-4 h-4 mr-1" />
                            {meta.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {isFull && !isPast && (
                    <p className="text-xs text-destructive">Übung ist voll besetzt</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
