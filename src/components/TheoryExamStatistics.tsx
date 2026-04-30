import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock, Target, Award } from "lucide-react";

interface ExamRow {
  id: string;
  name: string;
  dienstnummer: string;
  score: number | null;
  max_score: number;
  status: string;
  answers: Array<{ questionId: string; question: string; awardedPoints?: number; maxPoints: number }>;
  created_at: string;
}

const TheoryExamStatistics = () => {
  const { data: results, isLoading } = useQuery({
    queryKey: ["theory-exam-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theory_exam_results")
        .select("id, name, dienstnummer, score, max_score, status, answers, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ExamRow[];
    },
  });

  const stats = useMemo(() => {
    if (!results?.length) return null;

    const reviewed = results.filter((r) => r.status === "passed" || r.status === "failed");
    const passed = results.filter((r) => r.status === "passed");
    const failed = results.filter((r) => r.status === "failed");
    const pending = results.filter((r) => r.status === "submitted");

    const passRate = reviewed.length ? (passed.length / reviewed.length) * 100 : 0;

    const reviewedWithScore = reviewed.filter((r) => r.score !== null);
    const avgPercent = reviewedWithScore.length
      ? reviewedWithScore.reduce((sum, r) => sum + ((r.score! / r.max_score) * 100), 0) / reviewedWithScore.length
      : 0;

    const scores = reviewedWithScore.map((r) => (r.score! / r.max_score) * 100);
    const highest = scores.length ? Math.max(...scores) : 0;
    const lowest = scores.length ? Math.min(...scores) : 0;

    // Schwierigkeit pro Frage: Durchschnittliche Erreichbarkeitsquote
    const questionStats = new Map<string, { question: string; totalAwarded: number; totalMax: number; count: number }>();
    reviewed.forEach((r) => {
      r.answers?.forEach((a) => {
        const existing = questionStats.get(a.questionId) || { question: a.question, totalAwarded: 0, totalMax: 0, count: 0 };
        existing.totalAwarded += a.awardedPoints ?? 0;
        existing.totalMax += a.maxPoints;
        existing.count += 1;
        questionStats.set(a.questionId, existing);
      });
    });

    const questionDifficulty = Array.from(questionStats.entries())
      .map(([id, s]) => ({
        id,
        question: s.question,
        successRate: s.totalMax ? (s.totalAwarded / s.totalMax) * 100 : 0,
        attempts: s.count,
      }))
      .sort((a, b) => a.successRate - b.successRate);

    // Score-Verteilung in Buckets
    const buckets = [
      { label: "0–20%", min: 0, max: 20, count: 0 },
      { label: "20–40%", min: 20, max: 40, count: 0 },
      { label: "40–60%", min: 40, max: 60, count: 0 },
      { label: "60–80%", min: 60, max: 80, count: 0 },
      { label: "80–100%", min: 80, max: 100.01, count: 0 },
    ];
    scores.forEach((s) => {
      const b = buckets.find((b) => s >= b.min && s < b.max);
      if (b) b.count++;
    });
    const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

    return {
      total: results.length,
      reviewed: reviewed.length,
      passed: passed.length,
      failed: failed.length,
      pending: pending.length,
      passRate,
      avgPercent,
      highest,
      lowest,
      questionDifficulty,
      buckets,
      maxBucket,
    };
  }, [results]);

  if (isLoading) {
    return <div className="border border-border rounded-xl bg-card p-5 text-center text-muted-foreground animate-pulse">Lade Statistik...</div>;
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="border border-border rounded-xl bg-card p-5 text-center text-muted-foreground">
        Noch keine Theorieprüfungen vorhanden.
      </div>
    );
  }

  // Bewertungs-Hinweis: ist Prüfung zu schwer / zu leicht?
  let difficulty: { label: string; cls: string; hint: string };
  if (stats.passRate >= 90) {
    difficulty = { label: "Sehr leicht", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30", hint: "Bestehensquote über 90% – Prüfung könnte anspruchsvoller sein." };
  } else if (stats.passRate >= 70) {
    difficulty = { label: "Ausgewogen", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", hint: "Bestehensquote 70–90% – gute Schwierigkeit." };
  } else if (stats.passRate >= 50) {
    difficulty = { label: "Anspruchsvoll", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", hint: "Bestehensquote 50–70% – herausfordernd, aber machbar." };
  } else {
    difficulty = { label: "Sehr schwer", cls: "bg-red-500/10 text-red-400 border-red-500/30", hint: "Bestehensquote unter 50% – Prüfung evtl. zu schwer oder Lehrmaterial unzureichend." };
  }

  return (
    <div className="border border-border rounded-xl bg-card p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Theorieprüfungs-Statistik</h2>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${difficulty.cls}`} title={difficulty.hint}>
          {difficulty.label}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Target className="w-4 h-4" />} label="Bestehensquote" value={`${stats.passRate.toFixed(0)}%`} color="text-emerald-400" sub={`${stats.passed}/${stats.reviewed} bestanden`} />
        <KpiCard icon={<Award className="w-4 h-4" />} label="Ø Punktzahl" value={`${stats.avgPercent.toFixed(0)}%`} color="text-primary" sub="aller bewerteten" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Beste Leistung" value={`${stats.highest.toFixed(0)}%`} color="text-cyan-400" />
        <KpiCard icon={<TrendingDown className="w-4 h-4" />} label="Schlechteste" value={`${stats.lowest.toFixed(0)}%`} color="text-orange-400" />
      </div>

      {/* Status-Übersicht */}
      <div className="grid grid-cols-3 gap-3">
        <StatusBox icon={<CheckCircle2 className="w-4 h-4" />} count={stats.passed} label="Bestanden" cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
        <StatusBox icon={<XCircle className="w-4 h-4" />} count={stats.failed} label="Nicht bestanden" cls="bg-red-500/10 text-red-400 border-red-500/20" />
        <StatusBox icon={<Clock className="w-4 h-4" />} count={stats.pending} label="Offen" cls="bg-yellow-500/10 text-yellow-400 border-yellow-500/20" />
      </div>

      {/* Score-Verteilung */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Punkteverteilung</h3>
        <div className="space-y-1.5">
          {stats.buckets.map((b) => {
            const widthPct = (b.count / stats.maxBucket) * 100;
            const barColor = b.min < 50 ? "bg-red-500/60" : b.min < 70 ? "bg-yellow-500/60" : "bg-emerald-500/60";
            return (
              <div key={b.label} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-muted-foreground tabular-nums">{b.label}</span>
                <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${widthPct}%` }} />
                </div>
                <span className="w-8 text-right text-foreground tabular-nums font-medium">{b.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schwierigste Fragen */}
      {stats.questionDifficulty.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Schwierigste Fragen <span className="text-[10px] normal-case">(niedrigste Erfolgsquote)</span>
          </h3>
          <div className="space-y-1.5">
            {stats.questionDifficulty.slice(0, 5).map((q) => {
              const pct = q.successRate;
              const cls = pct < 40 ? "text-red-400" : pct < 70 ? "text-yellow-400" : "text-emerald-400";
              const barCls = pct < 40 ? "bg-red-500/60" : pct < 70 ? "bg-yellow-500/60" : "bg-emerald-500/60";
              return (
                <div key={q.id} className="bg-background/50 border border-border rounded-md p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-foreground line-clamp-2 flex-1">{q.question}</p>
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${cls}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded overflow-hidden">
                    <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{q.attempts} {q.attempts === 1 ? "Versuch" : "Versuche"}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground italic border-t border-border pt-3">
        💡 {difficulty.hint}
      </p>
    </div>
  );
};

const KpiCard = ({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub?: string }) => (
  <div className="bg-background/50 border border-border rounded-lg p-3">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
      {icon} {label}
    </div>
    <p className={`text-xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const StatusBox = ({ icon, count, label, cls }: { icon: React.ReactNode; count: number; label: string; cls: string }) => (
  <div className={`rounded-lg border p-2.5 flex items-center gap-2 ${cls}`}>
    {icon}
    <div>
      <p className="text-base font-bold tabular-nums leading-none">{count}</p>
      <p className="text-[10px] opacity-80">{label}</p>
    </div>
  </div>
);

export default TheoryExamStatistics;