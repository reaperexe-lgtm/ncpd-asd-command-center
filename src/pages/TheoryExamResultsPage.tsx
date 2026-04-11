import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Trash2,
  Plus, Image, Save, GripVertical, Pencil, Settings2
} from "lucide-react";

interface ExamAnswer {
  questionId: string;
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

interface ExamQuestion {
  id: string;
  question: string;
  points: number;
  type: string;
  image_url: string | null;
  sort_order: number;
  solution: string | null;
}

const TheoryExamResultsPage = () => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grading, setGrading] = useState<Record<string, Record<string, number>>>({});
  const [showQuestionManager, setShowQuestionManager] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState({ question: "", points: 1, type: "short" as string, solution: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const canManage = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");
  const canEditQuestions = ["admin", "director", "co_director", "supervisor"].includes(role || "");
  const isAdmin = ["admin", "director", "co_director"].includes(role || "");

  // Fetch exam results
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

  // Fetch questions for management
  const { data: questions } = useQuery({
    queryKey: ["theory-exam-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theory_exam_questions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ExamQuestion[];
    },
    enabled: canEditQuestions,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, score, status, answers }: { id: string; score: number; status: string; answers: ExamAnswer[] }) => {
      const { error } = await supabase
        .from("theory_exam_results")
        .update({
          score,
          status,
          answers: answers as any,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
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

  // Question management mutations
  const addQuestionMutation = useMutation({
    mutationFn: async (q: { question: string; points: number; type: string; image_url?: string; solution?: string }) => {
      const maxOrder = questions?.reduce((max, qq) => Math.max(max, qq.sort_order), 0) || 0;
      const { error } = await supabase.from("theory_exam_questions").insert({
        question: q.question,
        points: q.points,
        type: q.type,
        image_url: q.image_url || null,
        solution: q.solution || null,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-exam-questions"] });
      setNewQuestion({ question: "", points: 1, type: "short", solution: "" });
      toast.success("Frage hinzugefügt!");
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (q: ExamQuestion) => {
      const { error } = await supabase.from("theory_exam_questions")
        .update({ question: q.question, points: q.points, type: q.type, image_url: q.image_url, solution: q.solution })
        .eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-exam-questions"] });
      setEditingQuestion(null);
      toast.success("Frage aktualisiert!");
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("theory_exam_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-exam-questions"] });
      toast.success("Frage gelöscht!");
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `exam/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file);
    if (error) {
      toast.error("Bild-Upload fehlgeschlagen");
      return null;
    }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleGrade = (examId: string, exam: ExamResult) => {
    const points = grading[examId] || {};
    const gradedAnswers = (exam.answers as ExamAnswer[]).map((a) => ({
      ...a,
      awardedPoints: points[a.questionId] ?? a.awardedPoints ?? 0,
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

  const handleAddQuestionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      addQuestionMutation.mutate({ ...newQuestion, image_url: url });
    }
  };

  const handleEditQuestionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;
    const url = await uploadImage(file);
    if (url) {
      setEditingQuestion({ ...editingQuestion, image_url: url });
    }
  };

  if (!canManage) {
    return <div className="text-center py-12 text-muted-foreground">Keine Berechtigung.</div>;
  }

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground animate-pulse">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Theorieprüfung Ergebnisse</h1>
          <p className="text-sm text-muted-foreground mt-1">{results?.length || 0} eingereichte Tests</p>
        </div>
        {canEditQuestions && (
          <Button
            variant={showQuestionManager ? "default" : "outline"}
            onClick={() => setShowQuestionManager(!showQuestionManager)}
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Fragen verwalten
          </Button>
        )}
      </div>

      {/* Question Manager */}
      {showQuestionManager && canEditQuestions && (
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Fragenkatalog</h2>

          {/* Existing questions */}
          <div className="space-y-2">
            {questions?.map((q, i) => (
              <div key={q.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                {editingQuestion?.id === q.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editingQuestion.question}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                      className="bg-background border-border text-sm"
                    />
                    <div className="flex gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Punkte</Label>
                        <Input
                          type="number"
                          min={1}
                          value={editingQuestion.points}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) || 1 })}
                          className="w-20 h-8 bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Typ</Label>
                        <select
                          value={editingQuestion.type}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value })}
                          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        >
                          <option value="short">Kurz</option>
                          <option value="long">Lang</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditQuestionImage} />
                        <Button size="sm" variant="outline" onClick={() => editFileInputRef.current?.click()}>
                          <Image className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => updateQuestionMutation.mutate(editingQuestion)}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(null)}>Abbrechen</Button>
                      </div>
                    </div>
                    {editingQuestion.image_url && (
                      <div className="relative">
                        <img src={editingQuestion.image_url} alt="" className="max-h-32 rounded border border-border" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => setEditingQuestion({ ...editingQuestion, image_url: null })}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{i + 1}. {q.question}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{q.points} {q.points === 1 ? "Punkt" : "Punkte"}</Badge>
                          <Badge variant="outline" className="text-xs">{q.type === "short" ? "Kurz" : "Lang"}</Badge>
                          {q.image_url && <Badge variant="outline" className="text-xs gap-1"><Image className="w-3 h-3" /> Bild</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingQuestion(q)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => { if (confirm("Frage wirklich löschen?")) deleteQuestionMutation.mutate(q.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new question */}
          <div className="p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Neue Frage hinzufügen</h3>
            <Textarea
              value={newQuestion.question}
              onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
              placeholder="Fragetext eingeben..."
              className="bg-background border-border text-sm"
            />
            <div className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">Punkte</Label>
                <Input
                  type="number"
                  min={1}
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                  className="w-20 h-8 bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Typ</Label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="short">Kurz</option>
                  <option value="long">Lang</option>
                </select>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddQuestionImage} />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1">
                <Image className="w-4 h-4" /> Mit Bild
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!newQuestion.question.trim()) { toast.error("Fragetext eingeben"); return; }
                  addQuestionMutation.mutate(newQuestion);
                }}
                className="gap-1"
              >
                <Plus className="w-4 h-4" /> Hinzufügen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exam results list */}
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
                  {examAnswers.map((a, i) => {
                    const matchingQuestion = questions?.find(qq => qq.id === a.questionId);
                    return (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-foreground flex-1">
                          {i + 1}. {a.question}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                          max. {a.maxPoints} {a.maxPoints === 1 ? "Punkt" : "Punkte"}
                        </span>
                      </div>
                      {matchingQuestion?.image_url && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-border">
                          <img src={matchingQuestion.image_url} alt="Fragenbild" className="max-h-48 object-contain bg-black/10" />
                        </div>
                      )}
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
                    );
                  })}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-medium text-foreground">
                      Gesamt: {
                        Object.values(grading[exam.id] || {}).reduce((s: number, v: number) => s + v, 0) ||
                        examAnswers.reduce((s, a) => s + (a.awardedPoints || 0), 0)
                      } / {exam.max_score} Punkte
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { if (confirm("Test wirklich löschen?")) deleteMutation.mutate(exam.id); }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Löschen
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleGrade(exam.id, exam)} disabled={updateMutation.isPending}>
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
