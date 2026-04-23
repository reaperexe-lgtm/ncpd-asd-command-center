import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, ClipboardCheck, CheckCircle2, XCircle, ArrowLeft,
  Trash2, MapPin, AlertTriangle, Trophy
} from "lucide-react";

const ASD1_LOCATIONS = [
  "V-PD (Start)", "Buntes Parkhaus", "Film Studios", "Tropical Club", "Museum",
  "Juwelier (Sternenkreuzung)", "R-PD", "Rockford Plaza", "UFO",
  "Staatsbank (Laden)", "Staatsbank (Tankstelle)", "Elektriker-Job",
  "Vinewood PD / Casino-Brücke", "Casino", "Laufhaus / Rotlicht",
  "La Mesa Lager", "Schneiderei Straße", "Selbstuner", "LKW-Job",
  "Frosties Gebäude", "Cypress", "91 Thugs Hood", "Davis PD / Abschlepphof",
  "Davis Tankstelle", "Megamall / Hotbox", "Grove Tankstelle",
  "Maze Bank Arena", "Schrottplatz / Papierfabrik", "Benny's Straße",
  "Yacht-Hafen", "Vespucci Kleidungsladen", "Vespucci Lager",
  "Bubble Café", "Burger Shot", "V-PD (Ende)"
];

const ASD2_LOCATIONS = [
  "V-PD", "Burgershot", "Westhighway", "Mr Taxi", "Lifeinvader",
  "Friedhof", "Yakuza Straße / Yakie Straße", "Universität", "Playboy Villa",
  "Golfplatz", "Richman Hotel", "Eclipse Tower", "Bing Chilling",
  "Juwelier", "DOJ", "RPD", "Arcadius Tower / 7 Daily Globe",
  "Rotes Parkhaus", "Große Baustelle", "Autohaus",
  "Würfelpark Bank / Fleeca Bank", "MD", "Rathaus", "Marktplatz",
  "La Mesa Lager", "Schneiderei Straße", "Selbstuner", "Missionrow PD",
  "Davis MD / Fahrschule", "Unicorn", "Altes Bennys", "Mülljob Tankstelle",
  "Catcafe Tankstelle / Zugjob", "Catcafe", "Weazel News",
  "Little Seoul Tanke", "China Denkmal", "V-PD (Ende)"
];

interface ExamConfig {
  type: string;
  label: string;
  locations: string[];
  maxScore: number;
  passScore: number;
  hasUturn: boolean;
  max1033: number;
}

const EXAM_CONFIGS: Record<string, ExamConfig> = {
  ASD1: {
    type: "ASD1",
    label: "Bewerbungsprüfung ASD 1",
    locations: ASD1_LOCATIONS,
    maxScore: 35,
    passScore: 28,
    hasUturn: true,
    max1033: 5,
  },
  ASD2: {
    type: "ASD2",
    label: "Bewerbungsprüfung ASD 2",
    locations: ASD2_LOCATIONS,
    maxScore: 38,
    passScore: 30,
    hasUturn: false,
    max1033: 5,
  },
};

type ExamResult = {
  id: string;
  candidate_name: string;
  candidate_dienstnummer: string;
  exam_type: string;
  checked_locations: string[];
  himmelsrichtung_deduction: number;
  uturn_deduction: number;
  ten33_deduction: number;
  location_score: number;
  total_score: number;
  max_score: number;
  status: string;
  examiner_id: string;
  examiner_name: string | null;
  notes: string | null;
  created_at: string;
};

interface PracticalExamProps {
  examType?: string;
}

const PracticalExam = ({ examType = "ASD1" }: PracticalExamProps) => {
  const config = EXAM_CONFIGS[examType] || EXAM_CONFIGS.ASD1;
  const { role, user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedExam, setSelectedExam] = useState<ExamResult | null>(null);

  const [candidateName, setCandidateName] = useState("");
  const [candidateDienstnummer, setCandidateDienstnummer] = useState("");
  const [checkedLocations, setCheckedLocations] = useState<string[]>([]);
  const [himmelsrichtungDeduction, setHimmelsrichtungDeduction] = useState(0);
  const [uturnDeduction, setUturnDeduction] = useState(0);
  const [ten33Deduction, setTen33Deduction] = useState(0);
  const [notes, setNotes] = useState("");

  const canEdit = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  const locationScore = checkedLocations.length;
  const totalBonus = himmelsrichtungDeduction + (config.hasUturn ? uturnDeduction : 0) + ten33Deduction;
  const totalScore = Math.min(config.maxScore, locationScore + totalBonus);
  const passed = totalScore >= config.passScore;

  const { data: exams, isLoading } = useQuery({
    queryKey: ["practical-exams", examType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practical_exam_results")
        .select("*")
        .eq("exam_type", config.type)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        checked_locations: Array.isArray(d.checked_locations) ? d.checked_locations : [],
      })) as ExamResult[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("practical_exam_results").insert({
        candidate_name: candidateName,
        candidate_dienstnummer: candidateDienstnummer,
        exam_type: config.type,
        checked_locations: checkedLocations,
        himmelsrichtung_deduction: himmelsrichtungDeduction,
        uturn_deduction: config.hasUturn ? uturnDeduction : 0,
        ten33_deduction: ten33Deduction,
        location_score: locationScore,
        total_score: totalScore,
        max_score: config.maxScore,
        status: passed ? "passed" : "failed",
        examiner_id: user?.id,
        examiner_name: profile?.name || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practical-exams", examType] });
      toast.success("Prüfung gespeichert!");
      resetForm();
      setView("list");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practical_exam_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practical-exams", examType] });
      toast.success("Prüfung gelöscht");
      setView("list");
      setSelectedExam(null);
    },
  });

  const resetForm = () => {
    setCandidateName("");
    setCandidateDienstnummer("");
    setCheckedLocations([]);
    setHimmelsrichtungDeduction(0);
    setUturnDeduction(0);
    setTen33Deduction(0);
    setNotes("");
  };

  const toggleLocation = (loc: string) => {
    setCheckedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  // --- NEW EXAM FORM ---
  if (view === "new") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { resetForm(); setView("list"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
          </Button>
          <h2 className="text-xl font-bold text-foreground">{config.label}</h2>
        </div>

        {/* Candidate Info */}
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Bewerber-Informationen
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Name des Bewerbers</Label>
              <Input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Name..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Dienstnummer</Label>
              <Input value={candidateDienstnummer} onChange={e => setCandidateDienstnummer(e.target.value)} placeholder="Dienstnummer..." />
            </div>
          </div>
        </div>

        {/* Locations Checklist */}
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Prüfungsorte
            </h3>
            <Badge variant="secondary" className="text-sm">
              {checkedLocations.length} / {config.locations.length} Orte
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Haken Sie jeden Ort ab, den der Bewerber korrekt durchgegeben hat. Jeder Ort = 1 Punkt.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {config.locations.map((loc) => (
              <label
                key={loc}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  checkedLocations.includes(loc)
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={checkedLocations.includes(loc)}
                  onCheckedChange={() => toggleLocation(loc)}
                />
                <span className={`text-sm ${checkedLocations.includes(loc) ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {loc}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Manual Deductions */}
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Manuelle Zusatzpunkte
          </h3>
          <p className="text-xs text-muted-foreground">
            Tragen Sie die Zusatzpunkte manuell ein.
          </p>
          <div className={`grid gap-4 ${config.hasUturn ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div className="space-y-2">
              <Label className="text-xs">Himmelsrichtung (+1 bis +5)</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={himmelsrichtungDeduction}
                onChange={e => setHimmelsrichtungDeduction(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))}
              />
              <p className="text-xs text-muted-foreground">Keine Himmelsrichtung angesagt</p>
            </div>
            {config.hasUturn && (
              <div className="space-y-2">
                <Label className="text-xs">U-Turn Abzug (+1 je U-Turn)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={uturnDeduction}
                  onChange={e => setUturnDeduction(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <p className="text-xs text-muted-foreground">Keine U-Turns angesagt</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">10-33 Abzug (+1 je 10-33)</Label>
              <Input
                type="number"
                min={0}
                max={config.max1033}
                value={ten33Deduction}
                onChange={e => setTen33Deduction(Math.max(0, Math.min(config.max1033, parseInt(e.target.value) || 0)))}
              />
              <p className="text-xs text-muted-foreground">Keine 10-33 angesagt (max. {config.max1033})</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <Label className="text-xs">Anmerkungen (optional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notizen zur Prüfung..." rows={3} />
        </div>

        {/* Score Summary */}
        <div className={`border rounded-xl p-5 space-y-3 ${passed ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}`}>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Ergebnis
          </h3>
          <div className="grid gap-3 sm:grid-cols-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Ortspunkte</p>
              <p className="text-2xl font-bold text-foreground">{locationScore}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Zusatzpunkte</p>
              <p className="text-2xl font-bold text-green-400">+{totalBonus}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gesamt</p>
              <p className={`text-2xl font-bold ${passed ? "text-green-400" : "text-red-400"}`}>
                {totalScore} / {config.maxScore}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={`mt-1 ${passed ? "bg-green-600" : "bg-red-600"} text-white`}>
                {passed ? "Bestanden" : "Nicht Bestanden"}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Mindestpunktzahl: {config.passScore} / {config.maxScore} — Unterschreitung führt zur Ablehnung + 2 Wochen Bewerbungssperre
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (!candidateName.trim()) { toast.error("Name eingeben"); return; }
              if (!candidateDienstnummer.trim()) { toast.error("Dienstnummer eingeben"); return; }
              submitMutation.mutate();
            }}
            disabled={submitMutation.isPending}
            className="gap-2"
          >
            <ClipboardCheck className="w-4 h-4" />
            Prüfung abschließen
          </Button>
          <Button variant="secondary" onClick={() => { resetForm(); setView("list"); }}>Abbrechen</Button>
        </div>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  if (view === "detail" && selectedExam) {
    const exam = selectedExam;
    const isPassed = exam.status === "passed";
    const detailLocations = EXAM_CONFIGS[exam.exam_type]?.locations || config.locations;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedExam(null); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
          </Button>
          <h2 className="text-xl font-bold text-foreground">Prüfungsdetails</h2>
          <Badge className={`${isPassed ? "bg-green-600" : "bg-red-600"} text-white`}>
            {isPassed ? "Bestanden" : "Nicht Bestanden"}
          </Badge>
        </div>

        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Bewerber</p>
              <p className="font-medium text-foreground">{exam.candidate_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dienstnummer</p>
              <p className="font-medium text-foreground">{exam.candidate_dienstnummer}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prüfer</p>
              <p className="font-medium text-foreground">{exam.examiner_name || "Unbekannt"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Datum</p>
              <p className="font-medium text-foreground">{new Date(exam.created_at).toLocaleDateString("de-DE")}</p>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className={`border rounded-xl p-5 ${isPassed ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}`}>
          <div className="grid gap-3 sm:grid-cols-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Ortspunkte</p>
              <p className="text-2xl font-bold">{exam.location_score}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Zusatzpunkte</p>
              <p className="text-2xl font-bold text-green-400">
                +{exam.himmelsrichtung_deduction + exam.uturn_deduction + exam.ten33_deduction}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gesamt</p>
              <p className={`text-2xl font-bold ${isPassed ? "text-green-400" : "text-red-400"}`}>
                {exam.total_score} / {exam.max_score}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={`mt-1 ${isPassed ? "bg-green-600" : "bg-red-600"} text-white`}>
                {isPassed ? "Bestanden" : "Nicht Bestanden"}
              </Badge>
            </div>
          </div>
          <div className={`mt-4 grid gap-2 ${config.hasUturn ? "sm:grid-cols-3" : "sm:grid-cols-2"} text-sm`}>
            <div className="flex justify-between px-3 py-2 rounded bg-background border border-border">
              <span className="text-muted-foreground">Himmelsrichtung</span>
              <span className="text-green-400">+{exam.himmelsrichtung_deduction}</span>
            </div>
            {config.hasUturn && (
              <div className="flex justify-between px-3 py-2 rounded bg-background border border-border">
                <span className="text-muted-foreground">U-Turn</span>
                <span className="text-green-400">+{exam.uturn_deduction}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2 rounded bg-background border border-border">
              <span className="text-muted-foreground">10-33</span>
              <span className="text-green-400">+{exam.ten33_deduction}</span>
            </div>
          </div>
        </div>

        {/* Checked Locations */}
        <div className="border border-border rounded-xl bg-card p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Abgehakte Orte ({exam.checked_locations.length}/{detailLocations.length})
          </h3>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {detailLocations.map(loc => {
              const checked = exam.checked_locations.includes(loc);
              return (
                <div key={loc} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${checked ? "text-green-400" : "text-red-400/60"}`}>
                  {checked ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {loc}
                </div>
              );
            })}
          </div>
        </div>

        {exam.notes && (
          <div className="border border-border rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Anmerkungen</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{exam.notes}</p>
          </div>
        )}

        {["admin", "director", "co_director"].includes(role || "") && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (confirm("Prüfung wirklich löschen?")) deleteMutation.mutate(exam.id); }}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" /> Löschen
          </Button>
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{config.label}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {config.maxScore} Punkte · Mindestpunktzahl {config.passScore} · {exams?.length || 0} Prüfungen
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setView("new")} className="gap-2">
            <Plus className="w-4 h-4" /> Neue Prüfung
          </Button>
        )}
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground animate-pulse">Laden...</div>}

      {!isLoading && (!exams || exams.length === 0) && (
        <div className="text-center py-16 border border-border rounded-xl bg-card">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Prüfungen durchgeführt.</p>
        </div>
      )}

      {exams && exams.length > 0 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
          {exams.map((exam) => {
            const isPassed = exam.status === "passed";
            return (
              <button
                key={exam.id}
                onClick={() => { setSelectedExam(exam); setView("detail"); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isPassed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{exam.candidate_name}</span>
                    <Badge variant="outline" className="text-xs">{exam.candidate_dienstnummer}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(exam.created_at).toLocaleDateString("de-DE")} · Prüfer: {exam.examiner_name || "Unbekannt"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold ${isPassed ? "text-green-400" : "text-red-400"}`}>
                    {exam.total_score}/{exam.max_score}
                  </p>
                  <Badge className={`text-xs ${isPassed ? "bg-green-600" : "bg-red-600"} text-white`}>
                    {isPassed ? "Bestanden" : "Nicht bestanden"}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PracticalExam;
