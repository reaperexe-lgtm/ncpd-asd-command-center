import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, Clock, Plane, CheckCircle2, UserCheck,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FlightApplicantManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);

  // Only "Fluglizenz" category modules
  const { data: modules } = useQuery({
    queryKey: ["flight-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asd_training_modules")
        .select("*")
        .eq("category", "Fluglizenz")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: applicants } = useQuery({
    queryKey: ["flight-applicants"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "flight_applicant");
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

  const { data: allProgress } = useQuery({
    queryKey: ["flight-all-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asd_applicant_progress")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("flight-progress-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asd_applicant_progress" },
        () => queryClient.invalidateQueries({ queryKey: ["flight-all-progress"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const toggleProgressMutation = useMutation({
    mutationFn: async ({ applicantId, moduleId, completed, timeValue }: { applicantId: string; moduleId: string; completed: boolean; timeValue?: string }) => {
      const { error } = await supabase
        .from("asd_applicant_progress")
        .upsert(
          {
            applicant_id: applicantId,
            module_id: moduleId,
            completed,
            completed_by: completed ? user!.id : null,
            completed_at: completed ? new Date().toISOString() : null,
            time_value: timeValue ?? null,
          },
          { onConflict: "applicant_id,module_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-all-progress"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTimeMutation = useMutation({
    mutationFn: async ({ applicantId, moduleId, timeValue }: { applicantId: string; moduleId: string; timeValue: string }) => {
      const { error } = await supabase
        .from("asd_applicant_progress")
        .upsert(
          {
            applicant_id: applicantId,
            module_id: moduleId,
            completed: false,
            time_value: timeValue,
          },
          { onConflict: "applicant_id,module_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-all-progress"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Approve: change role flight_applicant → trial_member, create flight_licenses entry
  const approveMutation = useMutation({
    mutationFn: async (applicant: any) => {
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "trial_member" })
        .eq("user_id", applicant.id);
      if (roleError) throw roleError;

      const { error: licError } = await supabase
        .from("flight_licenses")
        .insert({
          name: applicant.name,
          team: "ASD",
          status: "Aktiv",
        });
      if (licError) throw licError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-applicants"] });
      toast.success("Bewerber freigegeben & Fluglizenz ausgestellt!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getApplicantCompletedCount = (applicantId: string) => {
    return allProgress?.filter((p) => p.applicant_id === applicantId && p.completed && modules?.some((m) => m.id === p.module_id)).length ?? 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Plane className="w-4 h-4 text-primary" />
        Fluglizenz-Bewerber verwalten ({applicants?.length ?? 0})
      </div>

      {!applicants?.length ? (
        <div className="text-center py-12 text-muted-foreground border border-border rounded-xl bg-card">
          Noch keine Fluglizenz-Bewerber registriert.
        </div>
      ) : (
        applicants.map((applicant) => {
          const completed = getApplicantCompletedCount(applicant.id);
          const total = modules?.length ?? 0;
          const percent = total > 0 ? (completed / total) * 100 : 0;
          const isExpanded = expandedApplicant === applicant.id;
          const isReady = total > 0 && completed === total;

          return (
            <div key={applicant.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="w-full p-4 flex items-center gap-3">
                <button
                  onClick={() => setExpandedApplicant(isExpanded ? null : applicant.id)}
                  className="flex items-center gap-3 flex-1"
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

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant={isReady ? "default" : "outline"}
                      className="gap-1.5 ml-2"
                      disabled={approveMutation.isPending}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Freigeben
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bewerber freigeben?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{applicant.name}</strong> wird zum <strong>Trial Member</strong> hochgestuft und erhält automatisch einen Fluglizenz-Eintrag.
                        {!isReady && (
                          <span className="block mt-2 text-orange-500">
                            ⚠ Achtung: Noch nicht alle Module ({completed}/{total}) abgeschlossen.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => approveMutation.mutate(applicant)}>
                        Freigeben & Lizenz ausstellen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {isExpanded && modules && (
                <div className="border-t border-border p-4 space-y-2">
                  {modules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Noch keine Fluglizenz-Module angelegt. Wechsle zum Tab „Module verwalten" und lege Module mit der Kategorie „Fluglizenz" an.
                    </p>
                  ) : (
                    modules.map((mod) => {
                      const prog = allProgress?.find(
                        (p) => p.applicant_id === applicant.id && p.module_id === mod.id,
                      );
                      const isCompleted = prog?.completed ?? false;
                      return (
                        <div
                          key={mod.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer select-none"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).tagName === "INPUT") return;
                            toggleProgressMutation.mutate({
                              applicantId: applicant.id,
                              moduleId: mod.id,
                              completed: !isCompleted,
                            });
                          }}
                        >
                          <Checkbox checked={isCompleted} onCheckedChange={() => {}} className="pointer-events-none" />
                          <span className={`text-sm flex-1 ${isCompleted ? "text-green-500 line-through" : "text-foreground"}`}>
                            {mod.name}
                          </span>
                          {mod.has_time_field && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                    })
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default FlightApplicantManagement;