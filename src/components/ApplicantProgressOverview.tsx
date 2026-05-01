import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const ApplicantProgressOverview = () => {
  const navigate = useNavigate();

  const { data: applicants } = useQuery({
    queryKey: ["applicants-progress-overview"],
    queryFn: async () => {
      // Get all asd_applicants
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "asd_applicant");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (!ids.length) return [];

      const [profilesRes, modulesRes, progressRes, theoryRes, practicalRes] = await Promise.all([
        supabase.from("profiles").select("id, name, dienstnummer, image_url").in("id", ids),
        supabase.from("asd_training_modules").select("id").eq("is_active", true),
        supabase.from("asd_applicant_progress").select("applicant_id, completed").in("applicant_id", ids),
        supabase.from("theory_exam_results").select("dienstnummer, status, created_at").order("created_at", { ascending: false }),
        supabase.from("practical_exam_results").select("candidate_dienstnummer, exam_type, status, released_to_applicant, created_at").order("created_at", { ascending: false }),
      ]);

      const totalModules = modulesRes.data?.length || 0;
      const profiles = profilesRes.data || [];
      const progress = progressRes.data || [];
      const theory = theoryRes.data || [];
      const practical = practicalRes.data || [];

      return profiles.map((p: any) => {
        const myProgress = progress.filter((pr: any) => pr.applicant_id === p.id && pr.completed).length;
        const theoryRes = theory.find((t: any) => t.dienstnummer === p.dienstnummer);
        const asd1 = practical.find((e: any) => e.candidate_dienstnummer === p.dienstnummer && e.exam_type === "ASD1");
        const asd2 = practical.find((e: any) => e.candidate_dienstnummer === p.dienstnummer && e.exam_type === "ASD2");
        const practicalPassed =
          (asd1?.released_to_applicant && asd1.status === "passed") ||
          (asd2?.released_to_applicant && asd2.status === "passed");

        const percent = totalModules > 0 ? (myProgress / totalModules) * 100 : 0;

        return {
          ...p,
          completed: myProgress,
          total: totalModules,
          percent,
          theoryStatus: theoryRes?.status || null,
          practicalPassed,
        };
      }).sort((a: any, b: any) => b.percent - a.percent);
    },
  });

  if (!applicants || applicants.length === 0) return null;

  return (
    <div className="w-full max-w-4xl bg-card border border-border rounded-lg p-3 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-primary flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Anwärter-Fortschritt
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">
          {applicants.length} {applicants.length === 1 ? "Anwärter" : "Anwärter"}
        </span>
      </div>

      <div className="space-y-3">
        {applicants.map((a: any) => {
          const theoryIcon =
            a.theoryStatus === "passed" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
            a.theoryStatus === "submitted" ? <Clock className="w-3.5 h-3.5 text-yellow-400" /> :
            a.theoryStatus === "failed" ? <XCircle className="w-3.5 h-3.5 text-red-400" /> :
            null;

          return (
            <div
              key={a.id}
              onClick={() => navigate("/ausbilder")}
              className="p-3 rounded-md bg-background/60 border border-border hover:bg-primary/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                {a.image_url ? (
                  <img src={a.image_url} alt="" className="w-9 h-9 rounded-full object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">DN {a.dienstnummer || "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {a.practicalPassed && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                      Praxis ✓
                    </span>
                  )}
                  {theoryIcon && (
                    <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-background border border-border font-medium">
                      Theorie {theoryIcon}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={a.percent} className="h-2 flex-1" />
                <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                  {a.completed}/{a.total} ({Math.round(a.percent)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicantProgressOverview;
