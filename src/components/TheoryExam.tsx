import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Plane, Hash, User, Send, Clock, Loader2 } from "lucide-react";
import asdLogo from "@/assets/asd-logo.png";

interface ExamQuestion {
  id: string;
  question: string;
  points: number;
  type: string;
  image_url: string | null;
  sort_order: number;
}

interface TheoryExamProps {
  onBack: () => void;
  embedded?: boolean;
  prefillName?: string;
  prefillDienstnummer?: string;
  onExamCompleted?: () => void;
  onStepChange?: (step: "info" | "quiz" | "done") => void;
}

const TheoryExam = ({ onBack, embedded, prefillName, prefillDienstnummer, onExamCompleted, onStepChange }: TheoryExamProps) => {
  const [step, setStepInternal] = useState<"info" | "quiz" | "done">("info");
  
  const setStep = (newStep: "info" | "quiz" | "done") => {
    setStepInternal(newStep);
    onStepChange?.(newStep);
  };
  const [name, setName] = useState(prefillName || "");
  const [dienstnummer, setDienstnummer] = useState(prefillDienstnummer || "");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submittedExamId, setSubmittedExamId] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<{
    status: string;
    score: number | null;
    max_score: number;
    reviewed_by: string | null;
    reviewer_name: string | null;
  } | null>(null);

  // Fetch questions from DB
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("theory_exam_questions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) {
        toast.error("Fehler beim Laden der Fragen");
        return;
      }
      setQuestions(data || []);
      setLoadingQuestions(false);
    };
    fetchQuestions();
  }, []);

  // Realtime subscription for exam result
  useEffect(() => {
    if (!submittedExamId) return;

    const channel = supabase
      .channel(`exam-result-${submittedExamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "theory_exam_results",
          filter: `id=eq.${submittedExamId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          let reviewerName: string | null = null;
          if (updated.reviewed_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", updated.reviewed_by)
              .single();
            reviewerName = profile?.name || null;
          }
          setExamResult({
            status: updated.status,
            score: updated.score,
            max_score: updated.max_score,
            reviewed_by: updated.reviewed_by,
            reviewer_name: reviewerName,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submittedExamId]);

  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const passThreshold = Math.ceil(maxScore * 0.73);

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dienstnummer.trim()) {
      toast.error("Bitte fülle alle Felder aus.");
      return;
    }
    setStep("quiz");
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      toast.error(`Bitte beantworte alle Fragen. ${unanswered.length} fehlen noch.`);
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || "",
        maxPoints: q.points,
      }));

      const { data: inserted, error } = await supabase.from("theory_exam_results").insert({
        name: name.trim(),
        dienstnummer: dienstnummer.trim(),
        answers: formattedAnswers,
        max_score: maxScore,
        status: "submitted",
      }).select("id").single();

      if (error) throw error;
      setSubmittedExamId(inserted.id);
      setExamResult({ status: "submitted", score: null, max_score: maxScore, reviewed_by: null, reviewer_name: null });
    setStep("done");
    onExamCompleted?.();
    } catch (error: any) {
      toast.error("Fehler beim Einreichen: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const q = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  return (
    <div className={embedded ? "w-full space-y-6" : "min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden"}>
      <div className={embedded ? "w-full space-y-6" : "w-full max-w-2xl space-y-6 relative"}>
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-primary/30 p-1 shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
              <img src={asdLogo} alt="ASD" className="w-full h-full object-contain rounded-full" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary tracking-tight">A.S.D Theorieprüfung</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "info" && "Trage deine Daten ein, um den Test zu starten"}
              {step === "quiz" && `Frage ${currentQuestion + 1} von ${questions.length}`}
              {step === "done" && "Test erfolgreich eingereicht!"}
            </p>
          </div>
        </div>

        {/* Step: Info */}
        {step === "info" && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-primary/[0.03]">
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm text-muted-foreground">
                In diesem Test wird Ihr Wissen zu der Theorieausbildung abgefragt.
                <span className="font-semibold text-primary"> Bestanden ab {passThreshold}/{maxScore} Punkten.</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Fragen bzgl. des Testes können bei ihrem Ausbilder gestellt werden.
              </p>
            </div>
            <form onSubmit={handleStartQuiz} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="examName" className="text-xs">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="examName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" required className="bg-background border-border pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="examDN" className="text-xs">Dienstnummer</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="examDN" value={dienstnummer} onChange={(e) => setDienstnummer(e.target.value)} placeholder="DN-00" required className="bg-background border-border pl-9" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-semibold">
                Test starten <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>
        )}

        {/* Step: Quiz */}
        {step === "quiz" && q && (
          <>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-primary/[0.03]">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                  Frage {currentQuestion + 1}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {q.points} {q.points === 1 ? "Punkt" : "Punkte"}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-foreground mb-4 leading-relaxed">{q.question}</h2>

              {q.image_url && (
                <div className="mb-4 rounded-lg overflow-hidden border border-border">
                  <img src={q.image_url} alt="Fragenbild" className="w-full max-h-[400px] object-contain bg-black/20" />
                </div>
              )}

              {q.type === "short" ? (
                <Input
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Deine Antwort..."
                  className="bg-background border-border text-base"
                />
              ) : (
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Deine Antwort..."
                  className="bg-background border-border min-h-[120px] text-base resize-none"
                />
              )}

              <div className="flex items-center justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Zurück
                </Button>
                {currentQuestion < questions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="gap-2">
                    Weiter <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? "Wird eingereicht..." : "Einreichen"} <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2 flex-wrap">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all border ${
                    i === currentQuestion
                      ? "bg-primary text-primary-foreground border-primary"
                      : answers[questions[i].id]?.trim()
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step: Done - Live Result */}
        {step === "done" && examResult && (
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg shadow-primary/[0.03] text-center space-y-4">
            {examResult.status === "submitted" && (
              <>
                <Clock className="w-16 h-16 text-yellow-500 mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Test eingereicht!</h2>
                <p className="text-muted-foreground">
                  Dein Test wurde erfolgreich eingereicht und wird von einem Ausbilder bewertet.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Warte auf Bewertung...
                </div>
              </>
            )}

            {examResult.status === "passed" && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold text-green-500">Bestanden!</h2>
                <p className="text-muted-foreground">Herzlichen Glückwunsch, du hast die Theorieprüfung bestanden!</p>
                <div className="text-2xl font-bold text-foreground">
                  {examResult.score}/{examResult.max_score} Punkte
                </div>
              </>
            )}

            {examResult.status === "failed" && (
              <>
                <XCircle className="w-16 h-16 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">Nicht bestanden</h2>
                <p className="text-muted-foreground">Leider hast du die Theorieprüfung nicht bestanden.</p>
                <div className="text-2xl font-bold text-foreground">
                  {examResult.score}/{examResult.max_score} Punkte
                </div>
              </>
            )}

            {examResult.reviewer_name && (
              <p className="text-sm text-muted-foreground">
                Bewertet von: <span className="font-medium text-foreground">{examResult.reviewer_name}</span>
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{name}</span> · {dienstnummer}
            </p>
          </div>
        )}

        {!embedded && (
          <p className="text-center text-sm text-muted-foreground">
            <button onClick={onBack} className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Zurück zur Anmeldung
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default TheoryExam;
