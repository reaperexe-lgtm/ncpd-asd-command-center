import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, CheckCircle, Plane, Hash, User, Send } from "lucide-react";
import SlideshowBackground from "@/components/SlideshowBackground";
import asdLogo from "@/assets/asd-logo.png";

const QUESTIONS = [
  {
    id: 1,
    question: "Was bedeutet die Abkürzung OW?",
    points: 1,
    type: "short" as const,
  },
  {
    id: 2,
    question: "Nenne 3 Aufgabengebiete der A.S.D und erkläre in 1-2 Sätzen.",
    points: 3,
    type: "long" as const,
  },
  {
    id: 3,
    question: "Nenne 2 der 3 Funktionen unserer Kamera.",
    points: 2,
    type: "short" as const,
  },
  {
    id: 4,
    question: "Nenne die wichtigste Regel beim benutzen einer Seilwinde.",
    points: 1,
    type: "short" as const,
  },
  {
    id: 5,
    question: "Nenne 3 Aufgabenbereiche des Co.-Piloten.",
    points: 3,
    type: "short" as const,
  },
  {
    id: 6,
    question: "Nenne und erläutere die beiden Funkcodes, welche für eine OW wichtig sind.",
    points: 2,
    type: "long" as const,
  },
  {
    id: 7,
    question: "Nenne die Bedeutung jeder Farbe (Rot, Gelb, Grün) im Einsatzgebiet.",
    points: 3,
    type: "long" as const,
  },
];

const MAX_SCORE = QUESTIONS.reduce((sum, q) => sum + q.points, 0);

interface TheoryExamProps {
  onBack: () => void;
}

const TheoryExam = ({ onBack }: TheoryExamProps) => {
  const [step, setStep] = useState<"info" | "quiz" | "done">("info");
  const [name, setName] = useState("");
  const [dienstnummer, setDienstnummer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dienstnummer.trim()) {
      toast.error("Bitte fülle alle Felder aus.");
      return;
    }
    setStep("quiz");
  };

  const handleSubmit = async () => {
    const unanswered = QUESTIONS.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      toast.error(`Bitte beantworte alle Fragen. ${unanswered.length} fehlen noch.`);
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = QUESTIONS.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || "",
        maxPoints: q.points,
      }));

      const { error } = await supabase.from("theory_exam_results").insert({
        name: name.trim(),
        dienstnummer: dienstnummer.trim(),
        answers: formattedAnswers,
        max_score: MAX_SCORE,
        status: "submitted",
      });

      if (error) throw error;
      setStep("done");
    } catch (error: any) {
      toast.error("Fehler beim Einreichen: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const q = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <SlideshowBackground />
      <div className="w-full max-w-2xl space-y-6 relative">
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
              {step === "quiz" && `Frage ${currentQuestion + 1} von ${QUESTIONS.length}`}
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
                <span className="font-semibold text-primary"> Bestanden ab {Math.ceil(MAX_SCORE * 0.73)}/{MAX_SCORE} Punkten.</span>
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
        {step === "quiz" && (
          <>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
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

              <h2 className="text-lg font-semibold text-foreground mb-6 leading-relaxed">
                {q.question}
              </h2>

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
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Zurück
                </Button>

                {currentQuestion < QUESTIONS.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="gap-2"
                  >
                    Weiter <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2"
                  >
                    {submitting ? "Wird eingereicht..." : "Einreichen"} <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Question overview dots */}
            <div className="flex justify-center gap-2 flex-wrap">
              {QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all border ${
                    i === currentQuestion
                      ? "bg-primary text-primary-foreground border-primary"
                      : answers[QUESTIONS[i].id]?.trim()
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

        {/* Step: Done */}
        {step === "done" && (
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg shadow-primary/[0.03] text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Test eingereicht!</h2>
            <p className="text-muted-foreground mb-2">
              Dein Test wurde erfolgreich eingereicht und wird von einem Ausbilder bewertet.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{name}</span> · {dienstnummer}
            </p>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <button onClick={onBack} className="text-primary hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Zurück zur Anmeldung
          </button>
        </p>
      </div>
    </div>
  );
};

export default TheoryExam;
