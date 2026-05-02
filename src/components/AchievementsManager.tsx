import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trophy, Plus, Pencil, Trash2, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star, Layers } from "lucide-react";

const METRICS: { value: string; label: string }[] = [
  { value: "missions_total", label: "Einsätze gesamt" },
  { value: "pursuits_total", label: "Verfolgungen gesamt" },
  { value: "pursuits_week", label: "Verfolgungen (Woche)" },
  { value: "protocols_total", label: "Protokolle gesamt" },
  { value: "formations_total", label: "Aufstellungen gesamt" },
  { value: "uebungen_attended", label: "Übungen besucht" },
  { value: "theory_passed", label: "Theorieprüfungen bestanden" },
  { value: "practical_passed", label: "Praxisprüfungen bestanden" },
  { value: "casino_jackpot", label: "Casino Jackpots" },
  { value: "casino_balance", label: "Casino Guthaben" },
  { value: "challenges_total", label: "Challenges abgeschlossen" },
];

const ICON_OPTIONS = ["Trophy", "Target", "Car", "FileText", "ClipboardList", "GraduationCap", "BookOpen", "Award", "Zap", "Crown", "Coins", "Star"];
const TIER_OPTIONS = ["bronze", "silver", "gold", "platinum", "diamond"];
const TIER_SEQUENCE = ["bronze", "silver", "gold", "platinum", "diamond"] as const;
const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin", diamond: "Diamant",
};
// Multipliers for the auto-generated 5-tier set, applied to base threshold
const TIER_MULTIPLIERS = [1, 2, 5, 10, 25];

const ICONS: Record<string, any> = {
  Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star,
};

const TIER_CLS: Record<string, string> = {
  bronze: "from-amber-700/30 to-amber-900/20 border-amber-700/50 text-amber-300",
  silver: "from-slate-400/30 to-slate-600/20 border-slate-400/50 text-slate-200",
  gold: "from-yellow-500/30 to-yellow-700/20 border-yellow-500/60 text-yellow-300",
  platinum: "from-cyan-300/30 to-purple-500/20 border-cyan-300/60 text-cyan-200",
  diamond: "from-fuchsia-400/30 to-indigo-500/20 border-fuchsia-300/60 text-fuchsia-200",
};

interface AchievementDef {
  id?: string;
  code: string;
  title: string;
  description: string;
  metric: string;
  threshold: number;
  tier: string;
  icon: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

const emptyDef: AchievementDef = {
  code: "",
  title: "",
  description: "",
  metric: "missions_total",
  threshold: 1,
  tier: "bronze",
  icon: "Trophy",
  category: "general",
  sort_order: 0,
  is_active: true,
};

const AchievementsManager = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AchievementDef | null>(null);
  const [open, setOpen] = useState(false);
  const [setOpen2, setSetOpen2] = useState(false);
  const [baseCodeTouched, setBaseCodeTouched] = useState(false);
  const [setForm, setSetForm] = useState({
    base_code: "",
    title: "",
    description: "",
    metric: "missions_total",
    base_threshold: 10,
    icon: "Trophy",
    category: "general",
    sort_order: 0,
  });

  const { data: defs, isLoading } = useQuery({
    queryKey: ["achievement-defs-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievement_definitions")
        .select("*")
        .order("sort_order")
        .order("title");
      if (error) throw error;
      return (data || []) as AchievementDef[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (def: AchievementDef) => {
      if (def.id) {
        const { error } = await supabase
          .from("achievement_definitions")
          .update({
            code: def.code, title: def.title, description: def.description,
            metric: def.metric, threshold: def.threshold, tier: def.tier,
            icon: def.icon, category: def.category, sort_order: def.sort_order,
            is_active: def.is_active,
          })
          .eq("id", def.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("achievement_definitions")
          .insert({
            code: def.code, title: def.title, description: def.description,
            metric: def.metric, threshold: def.threshold, tier: def.tier,
            icon: def.icon, category: def.category, sort_order: def.sort_order,
            is_active: def.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Achievement aktualisiert" : "Achievement erstellt");
      qc.invalidateQueries({ queryKey: ["achievement-defs-admin"] });
      qc.invalidateQueries({ queryKey: ["achievement-defs"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Speichern fehlgeschlagen"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("achievement_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Achievement gelöscht");
      qc.invalidateQueries({ queryKey: ["achievement-defs-admin"] });
      qc.invalidateQueries({ queryKey: ["achievement-defs"] });
    },
    onError: (e: any) => toast.error(e.message || "Löschen fehlgeschlagen"),
  });

  const openNew = () => { setEditing({ ...emptyDef }); setOpen(true); };
  const openEdit = (def: AchievementDef) => { setEditing({ ...def }); setOpen(true); };

  const createSetMutation = useMutation({
    mutationFn: async () => {
      if (!setForm.base_code.trim() || !setForm.title.trim()) {
        throw new Error("Basis-Code und Titel sind erforderlich");
      }
      const rows = TIER_SEQUENCE.map((tier, i) => ({
        code: `${setForm.base_code}_t${i + 1}`,
        base_code: setForm.base_code,
        tier_level: i + 1,
        title: `${setForm.title} ${TIER_LABELS[tier]}`,
        description: setForm.description || `${setForm.title} – ${TIER_LABELS[tier]}`,
        metric: setForm.metric,
        threshold: Math.max(1, Math.round(setForm.base_threshold * TIER_MULTIPLIERS[i])),
        tier,
        icon: setForm.icon,
        category: setForm.category,
        sort_order: setForm.sort_order * 10 + i,
        is_active: true,
      }));
      const { error } = await supabase.from("achievement_definitions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("5-Stufen-Set erstellt");
      qc.invalidateQueries({ queryKey: ["achievement-defs-admin"] });
      qc.invalidateQueries({ queryKey: ["achievement-defs"] });
      setSetOpen2(false);
      setSetForm({
        base_code: "", title: "", description: "", metric: "missions_total",
        base_threshold: 10, icon: "Trophy", category: "general", sort_order: 0,
      });
    },
    onError: (e: any) => toast.error(e.message || "Set-Erstellung fehlgeschlagen"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" /> Achievements verwalten
          <span className="ml-2 text-xs text-muted-foreground font-normal">{defs?.length || 0}</span>
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSetOpen2(true)} className="gap-1">
            <Layers className="w-4 h-4" /> 5-Stufen-Set
          </Button>
          <Button size="sm" onClick={openNew} className="gap-1">
            <Plus className="w-4 h-4" /> Einzeln
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Lade...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(defs || []).map((d) => {
              const Icon = ICONS[d.icon] || Trophy;
              return (
                <div
                  key={d.id}
                  className={`relative rounded-lg p-3 border bg-gradient-to-br ${TIER_CLS[d.tier] || TIER_CLS.bronze} ${!d.is_active ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-6 h-6 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight truncate">{d.title}</p>
                      <p className="text-[11px] opacity-80 leading-tight line-clamp-2">{d.description}</p>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] opacity-90">
                        <span className="px-1.5 py-0.5 rounded bg-background/30">{d.metric}</span>
                        <span className="px-1.5 py-0.5 rounded bg-background/30">≥ {d.threshold}</span>
                        <span className="px-1.5 py-0.5 rounded bg-background/30 uppercase">{d.tier}</span>
                        {!d.is_active && <span className="px-1.5 py-0.5 rounded bg-destructive/40">inaktiv</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(d)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Achievement löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{d.title}" wird endgültig gelöscht. Vergebene Achievements bleiben erhalten.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => d.id && deleteMutation.mutate(d.id)}
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Achievement bearbeiten" : "Neues Achievement"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code (eindeutig)</Label>
                  <Input
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    placeholder="z.B. first_mission"
                  />
                </div>
                <div>
                  <Label>Titel</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Metrik</Label>
                  <Select value={editing.metric} onValueChange={(v) => setEditing({ ...editing, metric: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Schwellenwert</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editing.threshold}
                    onChange={(e) => setEditing({ ...editing, threshold: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tier</Label>
                  <Select value={editing.tier} onValueChange={(v) => setEditing({ ...editing, tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIER_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={editing.icon} onValueChange={(v) => setEditing({ ...editing, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((i) => {
                        const I = ICONS[i];
                        return (
                          <SelectItem key={i} value={i}>
                            <span className="flex items-center gap-2"><I className="w-4 h-4" /> {i}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kategorie</Label>
                  <Input
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Sortierung</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label className="cursor-pointer">Aktiv</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>
              Abbrechen
            </Button>
            <Button
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={!editing?.code || !editing?.title || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5-Tier Set Dialog */}
      <Dialog open={setOpen2} onOpenChange={setSetOpen2}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> 5-Stufen-Set erstellen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Erstellt 5 Achievements (Bronze, Silber, Gold, Platin, Diamant) mit den Schwellen
              <span className="font-mono"> x1, x2, x5, x10, x25</span> deiner Basis-Schwelle.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Basis-Code</Label>
                <Input
                  value={setForm.base_code}
                  onChange={(e) => setSetForm({ ...setForm, base_code: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
                  placeholder="z.B. mission_master"
                />
              </div>
              <div>
                <Label>Titel</Label>
                <Input
                  value={setForm.title}
                  onChange={(e) => setSetForm({ ...setForm, title: e.target.value })}
                  placeholder="Einsatz-Profi"
                />
              </div>
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                rows={2}
                value={setForm.description}
                onChange={(e) => setSetForm({ ...setForm, description: e.target.value })}
                placeholder="Sammle so viele Einsätze wie möglich"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Metrik</Label>
                <Select value={setForm.metric} onValueChange={(v) => setSetForm({ ...setForm, metric: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Basis-Schwelle (Bronze)</Label>
                <Input
                  type="number"
                  min={1}
                  value={setForm.base_threshold}
                  onChange={(e) => setSetForm({ ...setForm, base_threshold: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Icon</Label>
                <Select value={setForm.icon} onValueChange={(v) => setSetForm({ ...setForm, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((i) => {
                      const I = ICONS[i];
                      return (
                        <SelectItem key={i} value={i}>
                          <span className="flex items-center gap-2"><I className="w-4 h-4" /> {i}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sortier-Block</Label>
                <Input
                  type="number"
                  value={setForm.sort_order}
                  onChange={(e) => setSetForm({ ...setForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px] space-y-1">
              <p className="font-bold text-foreground">Vorschau Schwellen:</p>
              {TIER_SEQUENCE.map((t, i) => (
                <div key={t} className="flex justify-between">
                  <span className="capitalize">{TIER_LABELS[t]}</span>
                  <span className="font-mono tabular-nums">
                    ≥ {Math.max(1, Math.round(setForm.base_threshold * TIER_MULTIPLIERS[i]))}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetOpen2(false)}>Abbrechen</Button>
            <Button
              onClick={() => createSetMutation.mutate()}
              disabled={createSetMutation.isPending || !setForm.base_code || !setForm.title}
            >
              {createSetMutation.isPending ? "Erstelle…" : "5 Stufen erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AchievementsManager;