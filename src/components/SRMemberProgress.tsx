import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SRTrainingCurriculum from "@/components/SRTrainingCurriculum";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";
import { allModuleCodes } from "@/lib/srCurriculum";

type Candidate = {
  id: string;
  name: string;
  internal_dienstnummer: string | null;
  dienstnummer: string | null;
  has_sr_training: boolean;
};

const SRMemberProgress = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      // alle freigeschalteten Member laden, deren SR-Anmeldung pending/approved ODER has_sr_training=true
      const { data: signups } = await supabase
        .from("sr_training_signups" as any)
        .select("user_id, status");
      const signupIds = new Set(((signups as any[]) || []).map((s) => s.user_id));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, internal_dienstnummer, dienstnummer, has_sr_training, is_approved")
        .eq("is_approved", true);
      const list: Candidate[] = ((profiles as any[]) || [])
        .filter((p) => p.has_sr_training || signupIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          internal_dienstnummer: p.internal_dienstnummer,
          dienstnummer: p.dienstnummer,
          has_sr_training: !!p.has_sr_training,
        }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCandidates(list);
    })();
  }, []);

  const loadProgress = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("sr_training_progress" as any)
      .select("module_code, completed")
      .eq("user_id", uid);
    const codes = ((data as any[]) || []).filter((r) => r.completed).map((r) => r.module_code);
    setProgress(new Set(codes));
    setLoading(false);
  };

  useEffect(() => {
    if (selected) loadProgress(selected);
    else setProgress(new Set());
  }, [selected]);

  const toggle = async (code: string, value: boolean) => {
    if (!selected || !user) return;
    const next = new Set(progress);
    if (value) next.add(code); else next.delete(code);
    setProgress(next);
    const { error } = await supabase
      .from("sr_training_progress" as any)
      .upsert(
        { user_id: selected, module_code: code, completed: value, completed_by: user.id, completed_at: new Date().toISOString() },
        { onConflict: "user_id,module_code" }
      );
    if (error) {
      toast.error(error.message);
      loadProgress(selected);
      return;
    }
    logActivity(value ? `SR-Modul ${code} abgehakt` : `SR-Modul ${code} entfernt`, "admin", { target_user_id: selected });

    // Auto-Zertifizierung: alle Module fertig + Theorie bestanden -> has_sr_training=true
    // Sobald wieder ein Modul entfernt wird -> Zertifizierung zurücksetzen
    const total = allModuleCodes().length;
    const candidate = candidates.find((c) => c.id === selected);
    const wasCertified = !!candidate?.has_sr_training;

    if (value && next.size === total && total > 0) {
      // Theorie-Status prüfen
      const { data: theory } = await supabase
        .from("sr_theory_exam_results")
        .select("passed")
        .eq("user_id", selected)
        .eq("passed", true)
        .limit(1)
        .maybeSingle();
      if (!theory) {
        toast.warning("Alle Module abgehakt, aber die Theorieprüfung ist noch nicht bestanden. Zertifizierung erfolgt automatisch danach.");
        return;
      }
      if (!wasCertified) {
        const { error: certErr } = await supabase
          .from("profiles")
          .update({ has_sr_training: true } as any)
          .eq("id", selected);
        if (certErr) { toast.error(certErr.message); return; }
        setCandidates((prev) => prev.map((c) => c.id === selected ? { ...c, has_sr_training: true } : c));
        toast.success("SR-Ausbildung abgeschlossen – Member ist nun zertifiziert!");
        logActivity("SR-Ausbildung automatisch abgeschlossen (Zertifizierung)", "admin", { target_user_id: selected });
      }
    } else if (!value && wasCertified) {
      // Modul wurde entfernt, war aber zertifiziert -> Zertifizierung zurückziehen
      const { error: certErr } = await supabase
        .from("profiles")
        .update({ has_sr_training: false } as any)
        .eq("id", selected);
      if (certErr) { toast.error(certErr.message); return; }
      setCandidates((prev) => prev.map((c) => c.id === selected ? { ...c, has_sr_training: false } : c));
      toast.info("Zertifizierung zurückgezogen, da nicht mehr alle Module abgehakt sind.");
      logActivity("SR-Zertifizierung zurückgezogen", "admin", { target_user_id: selected });
    }
  };

  const candidate = candidates.find((c) => c.id === selected);
  const total = allModuleCodes().length;
  const done = progress.size;
  const allDone = total > 0 && done === total;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">SR-Ausbildung – Modulfortschritt</h2>
      </div>

      <Card className="p-4 bg-card border-border space-y-3">
        <label className="text-xs font-medium text-muted-foreground">Member auswählen</label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Member mit SR-Anmeldung wählen..." />
          </SelectTrigger>
          <SelectContent>
            {candidates.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Keine Anwärter.</div>}
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.has_sr_training ? "✓" : ""} · {c.internal_dienstnummer || c.dienstnummer || "–"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {candidate && (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <p className="text-xs text-muted-foreground">
              {candidate.name} – {done}/{total} Module abgehakt
            </p>
            {candidate.has_sr_training ? (
              <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                <ShieldCheck className="w-3 h-3" /> Zertifiziert
              </Badge>
            ) : allDone ? (
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Theorieprüfung ausstehend</Badge>
            ) : (
              <Badge variant="outline" className="border-border text-muted-foreground">In Ausbildung</Badge>
            )}
          </div>
        )}
      </Card>

      {selected ? (
        loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Lade Fortschritt...</div>
        ) : (
          <SRTrainingCurriculum completed={progress} onToggle={toggle} />
        )
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">Bitte einen Member auswählen, um den Ausbildungsfortschritt zu pflegen.</p>
      )}
    </div>
  );
};

export default SRMemberProgress;
