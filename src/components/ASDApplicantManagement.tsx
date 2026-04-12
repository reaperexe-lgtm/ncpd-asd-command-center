import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  CheckCircle, Circle, Settings, Users, GraduationCap, Clock
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ASDApplicantManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bewerber");
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleCategory, setNewModuleCategory] = useState("Ausbildung");
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);

  // Fetch modules
  const { data: modules } = useQuery({
    queryKey: ["asd-training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asd_training_modules")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all ASD applicants
  const { data: applicants } = useQuery({
    queryKey: ["asd-applicants"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "asd_applicant");
      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      if (profilesError) throw profilesError;
      return profiles ?? [];
    },
  });

  // Fetch all progress
  const { data: allProgress } = useQuery({
    queryKey: ["asd-all-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asd_applicant_progress")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for progress updates
  useEffect(() => {
    const channel = supabase
      .channel("asd-progress-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asd_applicant_progress" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["asd-all-progress"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Add module
  const addModuleMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = modules?.length ?? 0;
      const { error } = await supabase.from("asd_training_modules").insert({
        name: newModuleName,
        category: newModuleCategory,
        sort_order: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asd-training-modules"] });
      setNewModuleName("");
      toast.success("Modul hinzugefügt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete module
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("asd_training_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asd-training-modules"] });
      toast.success("Modul gelöscht");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle progress
  const toggleProgressMutation = useMutation({
    mutationFn: async ({ applicantId, moduleId, completed, timeValue }: { applicantId: string; moduleId: string; completed: boolean; timeValue?: string }) => {
      const existing = allProgress?.find(
        (p) => p.applicant_id === applicantId && p.module_id === moduleId
      );

      if (existing) {
        const { error } = await supabase
          .from("asd_applicant_progress")
          .update({
            completed,
            completed_by: completed ? user!.id : null,
            completed_at: completed ? new Date().toISOString() : null,
            time_value: timeValue ?? existing.time_value,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("asd_applicant_progress").insert({
          applicant_id: applicantId,
          module_id: moduleId,
          completed,
          completed_by: completed ? user!.id : null,
          completed_at: completed ? new Date().toISOString() : null,
          time_value: timeValue ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asd-all-progress"] });
      queryClient.invalidateQueries({ queryKey: ["asd-applicant-progress"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update time value
  const updateTimeMutation = useMutation({
    mutationFn: async ({ applicantId, moduleId, timeValue }: { applicantId: string; moduleId: string; timeValue: string }) => {
      const existing = allProgress?.find(
        (p) => p.applicant_id === applicantId && p.module_id === moduleId
      );
      if (existing) {
        const { error } = await supabase
          .from("asd_applicant_progress")
          .update({ time_value: timeValue })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("asd_applicant_progress").insert({
          applicant_id: applicantId,
          module_id: moduleId,
          completed: false,
          time_value: timeValue,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asd-all-progress"] });
      queryClient.invalidateQueries({ queryKey: ["asd-applicant-progress"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getApplicantProgress = (applicantId: string) => {
    return allProgress?.filter((p) => p.applicant_id === applicantId) ?? [];
  };

  const getApplicantCompletedCount = (applicantId: string) => {
    return getApplicantProgress(applicantId).filter((p) => p.completed).length;
  };

  const groupedModules = modules?.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, typeof modules>);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 bg-secondary/50 border border-border">
          <TabsTrigger value="bewerber" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4" />
            Bewerber ({applicants?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="module" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4" />
            Module verwalten
          </TabsTrigger>
        </TabsList>

        {/* Applicant Progress Tab */}
        <TabsContent value="bewerber" className="mt-6 space-y-4">
          {!applicants?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Noch keine ASD-Bewerber registriert.
            </div>
          ) : (
            applicants.map((applicant) => {
              const completed = getApplicantCompletedCount(applicant.id);
              const total = modules?.length ?? 0;
              const percent = total > 0 ? (completed / total) * 100 : 0;
              const isExpanded = expandedApplicant === applicant.id;

              return (
                <div key={applicant.id} className="border border-border rounded-xl bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedApplicant(isExpanded ? null : applicant.id)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{applicant.name}</p>
                      <p className="text-xs text-muted-foreground">{applicant.dienstnummer}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <Progress value={percent} className="h-2" />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {completed}/{total}
                      </span>
                    </div>
                  </button>

                  {isExpanded && modules && (
                    <div className="border-t border-border p-4 space-y-4">
                      {groupedModules && Object.entries(groupedModules).map(([category, mods]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">{category}</h4>
                          {mods!.map((mod) => {
                            const prog = allProgress?.find(
                              (p) => p.applicant_id === applicant.id && p.module_id === mod.id
                            );
                            const isCompleted = prog?.completed ?? false;
                            return (
                              <div
                                key={mod.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
                              >
                                <Checkbox
                                  checked={isCompleted}
                                  onCheckedChange={(checked) =>
                                    toggleProgressMutation.mutate({
                                      applicantId: applicant.id,
                                      moduleId: mod.id,
                                      completed: !!checked,
                                    })
                                  }
                                />
                                <span className={`text-sm flex-1 ${isCompleted ? "text-green-500 line-through" : "text-foreground"}`}>
                                  {mod.name}
                                </span>
                                {mod.has_time_field && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <Input
                                      defaultValue={prog?.time_value ?? ""}
                                      key={`${applicant.id}-${mod.id}-${prog?.time_value}`}
                                      onBlur={(e) =>
                                        updateTimeMutation.mutate({
                                          applicantId: applicant.id,
                                          moduleId: mod.id,
                                          timeValue: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      }}
                                      placeholder="00:00"
                                      className="w-20 h-7 text-xs bg-background border-border"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                                {isCompleted && prog?.completed_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(prog.completed_at).toLocaleDateString("de-DE")}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Module Management Tab */}
        <TabsContent value="module" className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              placeholder="Neues Modul..."
              className="bg-background border-border"
            />
            <Input
              value={newModuleCategory}
              onChange={(e) => setNewModuleCategory(e.target.value)}
              placeholder="Kategorie"
              className="bg-background border-border w-40"
            />
            <Button
              onClick={() => addModuleMutation.mutate()}
              disabled={!newModuleName.trim()}
              size="sm"
              className="gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </Button>
          </div>

          {modules?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Noch keine Module angelegt. Erstelle das erste Modul oben.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedModules && Object.entries(groupedModules).map(([category, mods]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">{category}</h4>
                  {mods!.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{mod.name}</p>
                        {mod.description && <p className="text-xs text-muted-foreground">{mod.description}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{mod.category}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteModuleMutation.mutate(mod.id)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ASDApplicantManagement;
