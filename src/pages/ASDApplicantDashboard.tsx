import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Circle, GraduationCap, LogOut, BookOpen, Clock, Phone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import LeitfadenContent from "@/components/LeitfadenContent";
import TheorieausbildungContent from "@/components/TheorieausbildungContent";
import { toast } from "sonner";
import asdLogo from "@/assets/asd-logo.png";

const ASDApplicantDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("fortschritt");

  const { data: modules } = useQuery({
    queryKey: ["asd-training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asd_training_modules")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["asd-applicant-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asd_applicant_progress")
        .select("*")
        .eq("applicant_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const TRAINER_ROLES = ["director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"];
  const ROLE_LABELS: Record<string, string> = {
    director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
    ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder",
  };
  const ROLE_BADGE_COLORS: Record<string, string> = {
    director: "bg-red-500/20 text-red-400 border-red-500/30",
    co_director: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    supervisor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    ausbilder: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    trial_ausbilder: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  };

  const { data: trainerContacts } = useQuery({
    queryKey: ["trainer-contacts-applicant"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", TRAINER_ROLES as any);
      if (!roles?.length) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, phone_number")
        .in("id", userIds);
      return (profiles || [])
        .filter((p) => p.phone_number)
        .map((p) => ({
          ...p,
          role: roles.find((r) => r.user_id === p.id)?.role || "member",
        }));
    },
  });

  const completedCount = progress?.filter((p) => p.completed).length ?? 0;
  const totalCount = modules?.length ?? 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getProgressForModule = (moduleId: string) => {
    return progress?.find((p) => p.module_id === moduleId);
  };

  // Group modules by category
  const groupedModules = modules?.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, typeof modules>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={asdLogo} alt="ASD" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-lg font-bold text-foreground">ASD Ausbildung</h1>
              <p className="text-xs text-muted-foreground">
                {profile?.name} • {profile?.dienstnummer}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Abmelden
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Overview */}
        <div className="border border-border rounded-xl bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Dein Ausbildungsfortschritt</h2>
          </div>
          <Progress value={progressPercent} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">
            {completedCount} von {totalCount} Modulen abgeschlossen ({Math.round(progressPercent)}%)
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 bg-secondary/50 border border-border">
            <TabsTrigger value="fortschritt" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <GraduationCap className="w-4 h-4" />
              Fortschritt
            </TabsTrigger>
            <TabsTrigger value="mitarbeiter" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Phone className="w-4 h-4" />
              Mitarbeiter
            </TabsTrigger>
            <TabsTrigger value="leitfaden" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <BookOpen className="w-4 h-4" />
              Leitfaden
            </TabsTrigger>
            <TabsTrigger value="theorie" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <BookOpen className="w-4 h-4" />
              Theorieausbildung
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fortschritt" className="mt-6">
            {/* Module List */}
            {totalCount === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Noch keine Ausbildungsmodule konfiguriert.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedModules && Object.entries(groupedModules).map(([category, mods]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{category}</h3>
                    <div className="space-y-2">
                      {mods!.map((mod) => {
                        const prog = getProgressForModule(mod.id);
                        const isCompleted = prog?.completed ?? false;
                        return (
                          <div
                            key={mod.id}
                            className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                              isCompleted
                                ? "border-green-500/30 bg-green-500/5"
                                : "border-border bg-card"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isCompleted ? "text-green-500" : "text-foreground"}`}>
                                {mod.name}
                              </p>
                              {mod.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {prog?.time_value && (
                                <span className="text-xs text-primary flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {prog.time_value}
                                </span>
                              )}
                              {isCompleted && prog?.completed_at && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(prog.completed_at).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mitarbeiter" className="mt-6">
            <div className="border border-border rounded-xl bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Deine Ausbilder</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Hier findest du die Kontaktdaten deiner Ausbilder. Klicke auf die Nummer, um sie zu kopieren.
              </p>
              <div className="space-y-3">
                {(trainerContacts || []).map((trainer) => (
                  <div key={trainer.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <p className="font-medium text-foreground">{trainer.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${ROLE_BADGE_COLORS[trainer.role] || ""}`}>
                          {ROLE_LABELS[trainer.role] || trainer.role}
                        </Badge>
                        {trainer.dienstnummer && (
                          <span className="text-xs text-muted-foreground">#{trainer.dienstnummer}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 font-mono"
                      onClick={() => {
                        navigator.clipboard.writeText(trainer.phone_number || "");
                        toast.success("Nummer kopiert!");
                      }}
                    >
                      <Phone className="w-3 h-3" />
                      {trainer.phone_number}
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                {(!trainerContacts || trainerContacts.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Noch keine Kontaktdaten hinterlegt.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="leitfaden" className="mt-6">
            <LeitfadenContent />
          </TabsContent>

          <TabsContent value="theorie" className="mt-6">
            <TheorieausbildungContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ASDApplicantDashboard;
