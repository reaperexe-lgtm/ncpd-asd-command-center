import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Save, X, GraduationCap,
  ChevronDown, ChevronUp, BookOpen, Eye
} from "lucide-react";
import LeitfadenContent from "./LeitfadenContent";
import TheorieausbildungContent from "./TheorieausbildungContent";

interface TrainingModule {
  id: string;
  name: string;
  description: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["Grundausbildung", "Waffenausbildung", "Flugausbildung", "Spezialausbildung", "Allgemein"];

const TrainingModules = ({ onNavigateToExam }: { onNavigateToExam?: (examType: "ASD1" | "ASD2") => void }) => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "Allgemein" });
  const [showLeitfaden, setShowLeitfaden] = useState(false);
  const [showTheorie, setShowTheorie] = useState(false);

  const canEdit = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  const { data: modules, isLoading } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TrainingModule[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (m: { name: string; description: string; category: string }) => {
      const maxOrder = modules?.reduce((max, mod) => Math.max(max, mod.sort_order), 0) || 0;
      const { error } = await supabase.from("training_modules").insert({
        name: m.name,
        description: m.description || null,
        category: m.category,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      setForm({ name: "", description: "", category: "Allgemein" });
      setShowForm(false);
      toast.success("Ausbildungsmodul hinzugefügt!");
    },
    onError: () => toast.error("Fehler beim Hinzufügen"),
  });

  const updateMutation = useMutation({
    mutationFn: async (m: TrainingModule) => {
      const { error } = await supabase.from("training_modules")
        .update({ name: m.name, description: m.description, category: m.category, is_active: m.is_active })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      setEditingModule(null);
      toast.success("Modul aktualisiert!");
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      toast.success("Modul gelöscht!");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  // Group modules by category
  const grouped = modules?.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, TrainingModule[]>) || {};

  const categoryOrder = CATEGORIES.filter(c => grouped[c]);
  const extraCategories = Object.keys(grouped).filter(c => !CATEGORIES.includes(c));
  const allCategories = [...categoryOrder, ...extraCategories];

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground animate-pulse">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ausbildungsmodule</h2>
          <p className="text-sm text-muted-foreground mt-1">{modules?.length || 0} Module</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "secondary" : "default"}
            className="gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Abbrechen" : "Neues Modul"}
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && canEdit && (
        <div className="border border-dashed border-primary/30 rounded-xl bg-primary/5 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Neues Ausbildungsmodul</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Modulname..."
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Kategorie</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Beschreibung</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Beschreibung des Moduls..."
              className="bg-background border-border"
              rows={3}
            />
          </div>
          <Button
            onClick={() => {
              if (!form.name.trim()) { toast.error("Name eingeben"); return; }
              addMutation.mutate(form);
            }}
            disabled={addMutation.isPending}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        </div>
      )}

      {/* No modules */}
      {allCategories.length === 0 && (
        <div className="text-center py-16 border border-border rounded-xl bg-card">
          <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Ausbildungsmodule erstellt.</p>
        </div>
      )}

      {/* Modules grouped by category */}
      <div className="space-y-4">
        {allCategories.map((category) => {
          const mods = grouped[category];
          const isExpanded = expandedCategory === category || allCategories.length <= 2;

          return (
            <div key={category} className="border border-border rounded-xl bg-card overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded && allCategories.length > 2 ? null : category)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{category}</h3>
                    <p className="text-xs text-muted-foreground">{mods.length} {mods.length === 1 ? "Modul" : "Module"}</p>
                  </div>
                </div>
                {allCategories.length > 2 && (
                  isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {mods.map((mod, i) => (
                    <div
                      key={mod.id}
                      className={`p-4 flex items-start gap-4 ${i < mods.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors`}
                    >
                      {editingModule?.id === mod.id ? (
                        <div className="flex-1 space-y-3">
                          <Input
                            value={editingModule.name}
                            onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                            className="bg-background border-border"
                          />
                          <Textarea
                            value={editingModule.description || ""}
                            onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                            className="bg-background border-border"
                            rows={2}
                          />
                          <select
                            value={editingModule.category}
                            onChange={(e) => setEditingModule({ ...editingModule, category: e.target.value })}
                            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateMutation.mutate(editingModule)} disabled={updateMutation.isPending}>
                              <Save className="w-4 h-4 mr-1" /> Speichern
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingModule(null)}>Abbrechen</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground">{mod.name}</h4>
                              {!mod.is_active && <Badge variant="secondary" className="text-xs">Inaktiv</Badge>}
                              {mod.name === "NCPD ASD | Ausbildungsleitfaden" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setShowLeitfaden(!showLeitfaden)}
                                >
                                  <Eye className="w-3 h-3" />
                                  {showLeitfaden ? "Ausblenden" : "Leitfaden öffnen"}
                                </Button>
                              )}
                              {mod.name === "ASD | Theorieausbildung" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setShowTheorie(!showTheorie)}
                                >
                                  <Eye className="w-3 h-3" />
                                  {showTheorie ? "Ausblenden" : "Theorie öffnen"}
                                </Button>
                              )}
                            </div>
                            {mod.description && (
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{mod.description}</p>
                            )}
                            {mod.name === "NCPD ASD | Ausbildungsleitfaden" && showLeitfaden && (
                              <div className="mt-4">
                                <LeitfadenContent onNavigateToExam={onNavigateToExam} />
                              </div>
                            )}
                            {mod.name === "ASD | Theorieausbildung" && showTheorie && (
                              <div className="mt-4">
                                <TheorieausbildungContent />
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingModule(mod)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => { if (confirm("Modul wirklich löschen?")) deleteMutation.mutate(mod.id); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingModules;
