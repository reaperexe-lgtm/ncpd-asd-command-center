import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

type Question = {
  id: string;
  q: string;
  options: string[];
  correct: number;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    q: "Was bedeutet SR?",
    options: ["Special Response", "Search & Rescue", "Strategic Reserve", "Safety Recovery"],
    correct: 1,
  },
  {
    id: "q2",
    q: "Warum ist die Grundzertifizierung so wichtig?",
    options: [
      "Weil sie ein Privileg darstellt",
      "Damit Piloten optisch erkennbar sind",
      "Weil sie die Grundlage für sichere Spezialeinsätze bildet",
      "Sie ist nicht zwingend nötig",
    ],
    correct: 2,
  },
  {
    id: "q3",
    q: "Was sind SOPs?",
    options: [
      "Standard Operating Procedures – verbindliche Abläufe",
      "Spezielle Operative Piloten",
      "Sichtbare Optische Punkte",
      "Sonderoperationen ohne Plan",
    ],
    correct: 0,
  },
  {
    id: "q4",
    q: "Welche Aufgabe hat der Spotter?",
    options: [
      "Er führt den Heli",
      "Er beobachtet, koordiniert und unterstützt den Piloten",
      "Er repariert den Heli im Flug",
      "Er ersetzt den Co-Piloten",
    ],
    correct: 1,
  },
  {
    id: "q5",
    q: "Warum ist der Schwebeflug bei SR-Einsätzen entscheidend?",
    options: [
      "Er spart Treibstoff",
      "Er ermöglicht präzises Bergen und Absetzen ohne Landung",
      "Er ist schneller als Vorwärtsflug",
      "Er sieht beeindruckender aus",
    ],
    correct: 1,
  },
  {
    id: "q6",
    q: "Welche Gefahr ist bei Dachlandungen besonders kritisch?",
    options: [
      "Zu viel Treibstoff",
      "Lockere Bauteile, Hindernisse und Einsturzgefahr",
      "Funkstörungen",
      "Zu kalter Motor",
    ],
    correct: 1,
  },
  {
    id: "q7",
    q: "Was ist eine Autorotation?",
    options: [
      "Ein automatischer Autopilot-Modus",
      "Eine schnelle 360°-Drehung",
      "Ein Notlandeverfahren bei Triebwerksausfall",
      "Eine Rotor-Reinigungsfunktion",
    ],
    correct: 2,
  },
  {
    id: "q8",
    q: "Wann darf der Rotor abgestellt werden?",
    options: [
      "Sofort nach Aufsetzen",
      "Erst wenn der Heli sicher steht und Personal außerhalb der Gefahrenzone ist",
      "Bereits im Schwebeflug",
      "Nach Anweisung des Spotters jederzeit",
    ],
    correct: 1,
  },
  {
    id: "q9",
    q: "Warum sind Wind und Hindernisse entscheidend?",
    options: [
      "Sie beeinflussen Flugbahn, Stabilität und Sicherheit der Mission",
      "Sie verändern das Aussehen des Helis",
      "Sie wirken nur am Boden",
      "Sie sind irrelevant bei SR",
    ],
    correct: 0,
  },
  {
    id: "q10",
    q: "Wie sollte ein Anflug bei einer Dachlandung idealerweise erfolgen?",
    options: [
      "Mit Rückenwind, schnell",
      "Gegen den Wind, mit Fluchtweg und ohne Seitenwind",
      "Im starken Seitenwind",
      "Im Kreis, um Übersicht zu behalten",
    ],
    correct: 1,
  },
];

const PASS_THRESHOLD = 8; // 8 von 10

type Props = {
  onPassed: () => void;
};

const SRTheoryExam = ({ onPassed }: Props) => {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!user || !allAnswered) return;
    setSubmitting(true);
    let score = 0;
    QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.correct) score++;
    });
    const passed = score >= PASS_THRESHOLD;
    const { error } = await supabase.from("sr_theory_exam_results").insert({
      user_id: user.id,
      score,
      max_score: QUESTIONS.length,
      passed,
      answers: answers as any,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen: " + error.message);
      return;
    }
    setResult({ score, passed });
    if (passed) {
      toast.success(`Bestanden! ${score}/${QUESTIONS.length}`);
      logActivity("Hat die SR-Theorieprüfung bestanden", "general");
      onPassed();
    } else {
      toast.error(`Nicht bestanden: ${score}/${QUESTIONS.length} – mind. ${PASS_THRESHOLD} nötig`);
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  if (result && !result.passed) {
    return (
      <Card className="bg-destructive/5 border-destructive/40 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <XCircle className="w-8 h-8 text-destructive" />
          <div>
            <h3 className="text-lg font-bold text-destructive">Leider nicht bestanden</h3>
            <p className="text-sm text-muted-foreground">
              Du hast {result.score}/{QUESTIONS.length} Punkte erreicht. Mindestens {PASS_THRESHOLD} sind nötig.
              Lies die Theorie noch einmal in Ruhe durch.
            </p>
          </div>
        </div>
        <Button onClick={reset} variant="outline">Erneut versuchen</Button>
      </Card>
    );
  }

  if (result && result.passed) {
    return (
      <Card className="bg-primary/5 border-primary/40 p-6 flex items-center gap-3">
        <CheckCircle2 className="w-8 h-8 text-primary" />
        <div>
          <h3 className="text-lg font-bold text-primary">Theorieprüfung bestanden</h3>
          <p className="text-sm text-muted-foreground">
            Ergebnis: {result.score}/{QUESTIONS.length}. Deine Module werden jetzt freigeschaltet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-7 h-7 text-primary" />
        <div>
          <h3 className="text-lg font-bold text-foreground">SR-Theorieprüfung</h3>
          <p className="text-sm text-muted-foreground">
            {QUESTIONS.length} Fragen. Bestehensgrenze: {PASS_THRESHOLD} richtige Antworten.
          </p>
        </div>
      </div>
      <div className="space-y-6">
        {QUESTIONS.map((q, idx) => (
          <div key={q.id} className="space-y-3 pb-4 border-b border-border last:border-b-0">
            <Label className="text-base font-semibold text-foreground">
              {idx + 1}. {q.q}
            </Label>
            <RadioGroup
              value={answers[q.id]?.toString() ?? ""}
              onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: parseInt(v) }))}
            >
              {q.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <RadioGroupItem value={i.toString()} id={`${q.id}-${i}`} />
                  <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer text-sm font-normal text-foreground">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={!allAnswered || submitting} className="gap-2">
        <CheckCircle2 className="w-4 h-4" /> Prüfung abgeben
      </Button>
    </Card>
  );
};

export default SRTheoryExam;