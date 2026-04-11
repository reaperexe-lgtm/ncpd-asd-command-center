import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";

interface ExamAnswer {
  questionId: number;
  question: string;
  answer: string;
  maxPoints: number;
  awardedPoints?: number;
}

interface ExamResult {
  id: string;
  name: string;
  dienstnummer: string;
  answers: ExamAnswer[];
  score: number | null;
  max_score: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const TheoryExamResultsPage = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grading, setGrading] = useState<Record<string, Record<number, number>>>({});

  const canManage = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  const { data: results, isLoading } = useQuery({
    queryKey: ["theory-exam-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theory_exam_results")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ExamResult[];
    },
    enabled: canManage,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, score, status, answers }: { id: string; score: number; status: string; answers: ExamAnswer[] }) => {
      const { error } = await supabase
        .from("theory_exam_results")
        .update({ score, status, answers: answers as any, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-exam-results"] });
      toast.success("Bewertung gespeichert!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("theory_exam_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-exam-results"] });
      toast.success("Ergebnis gelöscht.");
    },
  });

  const handleGrade = (examId: string, exam: ExamResult) => {
    const points = grading[examId] || {};
    const gradedAnswers = (exam.answers as ExamAnswer[]).map((a) => ({
      ...a,
      awardedPoints: points[a.questionId] ?? 0,
    }));
    const totalScore = gradedAnswers.reduce((s, a) => s + (a.awardedPoints || 0), 0);
    const passed = totalScore >= Math.ceil(exam.max_score * 0.73);

    updateMutation.mutate({
      id: examId,
      score: totalScore,
      status: passed ? "passed" : "failed",
      answers: gradedAnswers,
    });
  };

  const isAdmin = ["admin", "director", "co_director"].includes(role || "");

  if (!canManage) {
    return <div className="text-center py-12 text-muted-foreground">Keine Berechtigung.</div>;
  }

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground animate-pulse">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Theorieprüfung Ergebnisse</h1>
        <p className="text-sm text-muted-foreground mt-1">{results?.length || 0} eingereichte Tests</p>
      </div>

      {results?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border border-border rounded-xl bg-card">
          Noch keine Tests eingereicht.
        </div>
      )}

      <div className="space-y-3">
        {results?.map((exam) => {
          const isExpanded = expandedId === exam.id;
          const examAnswers = exam.answers as ExamAnswer[];

          return (
            <div key={exam.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : exam.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <span className="font-semibold text-foreground">{exam.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">{exam.dienstnummer}</span>
                  </div>
                  <Badge
                    variant={exam.status === "passed" ? "default" : exam.status === "failed" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {exam.status === "passed" && <><CheckCircle className="w-3 h-3 mr-1" /> Bestanden</>}
                    {exam.status === "failed" && <><XCircle className="w-3 h-3 mr-1" /> Nicht bestanden</>}
                    {exam.status === "submitted" && <><Clock className="w-3 h-3 mr-1" /> Ausstehend</>}
                  </Badge>
                  {exam.score !== null && (
                    <span className="text-xs text-muted-foreground">{exam.score}/{exam.max_score} Punkte</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(exam.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {examAnswers.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-foreground flex-1">
                          {a.questionId}. {a.question}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                          max. {a.maxPoints} {a.maxPoints === 1 ? "Punkt" : "Punkte"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 bg-background rounded p-2 mb-2 whitespace-pre-wrap">
                        {a.answer || <span className="italic text-muted-foreground">Keine Antwort</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Punkte:</span>
                        <Input
                          type="number"
                          min={0}
                          max={a.maxPoints}
                          value={grading[exam.id]?.[a.questionId] ?? a.awardedPoints ?? ""}
                          onChange={(e) => {
                            const val = Math.min(a.maxPoints, Math.max(0, parseInt(e.target.value) || 0));
                            setGrading((prev) => ({
                              ...prev,
                              [exam.id]: { ...prev[exam.id], [a.questionId]: val },
                            }));
                          }}
                          className="w-16 h-8 text-center text-sm bg-background"
                        />
                        <span className="text-xs text-muted-foreground">/ {a.maxPoints}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-medium text-foreground">
                      Gesamt: {
                        Object.values(grading[exam.id] || {}).reduce((s, v) => s + v, 0) ||
                        examAnswers.reduce((s, a) => s + (a.awardedPoints || 0), 0)
                      } / {exam.max_score} Punkte
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Test wirklich löschen?")) deleteMutation.mutate(exam.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Löschen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleGrade(exam.id, exam)}
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Bewertung speichern
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TheoryExamResultsPage;
