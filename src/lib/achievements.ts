import { supabase } from "@/integrations/supabase/client";
import { getChallengeWeekStart } from "@/lib/weekBoundary";

/**
 * Berechnet alle Achievement-Metriken für einen User und schaltet
 * die jeweils erreichten Badges frei. Wird beim Laden der Achievements-Seite
 * UND nach jedem relevanten Event (Mission, Verfolgung, etc.) aufgerufen.
 */
export type Metric =
  | "missions_total"
  | "missions_week"
  | "pursuits_total"
  | "pursuits_week"
  | "protocols_total"
  | "formations_total"
  | "uebungen_attended"
  | "theory_passed"
  | "practical_passed"
  | "casino_jackpot"
  | "casino_balance"
  | "challenges_total";

export interface MetricSnapshot {
  missions_total: number;
  missions_week: number;
  pursuits_total: number;
  pursuits_week: number;
  protocols_total: number;
  formations_total: number;
  uebungen_attended: number;
  theory_passed: number;
  practical_passed: number;
  casino_jackpot: number;
  casino_balance: number;
  challenges_total: number;
}

export async function computeMetrics(userId: string, userName: string, dienstnummer?: string | null): Promise<MetricSnapshot> {
  // Wöchentlicher Reset für "diese Woche"-Metriken: Sonntag 20:00 Uhr (Berlin), nicht Mitternacht.
  const weekStart = getChallengeWeekStart().toISOString();

  const [missionsRes, missionsWeekRes, pursuitsRes, pursuitsWeekRes, protocolsRes, formationsRes, uebungenRes, theoryRes, practicalRes, balanceRes, challengesRes] = await Promise.all([
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId),
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", weekStart),
    supabase.from("pursuits").select("id", { count: "exact", head: true }).eq("created_by", userId),
    supabase.from("pursuits").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", weekStart),
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("protokollschreiber", userId),
    supabase.from("formation_protocols").select("id", { count: "exact", head: true }).eq("created_by", userId),
    supabase.from("uebung_teilnahmen").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "zusage"),
    dienstnummer
      ? supabase.from("theory_exam_results").select("id", { count: "exact", head: true }).eq("dienstnummer", dienstnummer).eq("status", "passed")
      : Promise.resolve({ count: 0 } as any),
    dienstnummer
      ? supabase.from("practical_exam_results").select("id", { count: "exact", head: true }).eq("candidate_dienstnummer", dienstnummer).eq("status", "passed")
      : Promise.resolve({ count: 0 } as any),
    supabase.from("casino_balances").select("balance").eq("user_id", userId).maybeSingle(),
    supabase.from("challenge_completions").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  // casino_jackpot: count activity_logs of action 'jackpot' for this user
  const { count: jackpotCount } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "casino_jackpot");

  return {
    missions_total: missionsRes.count || 0,
    missions_week: missionsWeekRes.count || 0,
    pursuits_total: pursuitsRes.count || 0,
    pursuits_week: pursuitsWeekRes.count || 0,
    protocols_total: protocolsRes.count || 0,
    formations_total: formationsRes.count || 0,
    uebungen_attended: uebungenRes.count || 0,
    theory_passed: (theoryRes as any).count || 0,
    practical_passed: (practicalRes as any).count || 0,
    casino_jackpot: jackpotCount || 0,
    casino_balance: (balanceRes.data as any)?.balance || 0,
    challenges_total: challengesRes.count || 0,
  };
}

const TIER_REWARDS: Record<string, number> = {
  bronze: 5_000,
  silver: 10_000,
  gold: 25_000,
  platinum: 50_000,
  diamond: 100_000,
};

// Diese Metriken zählen als Einsatz/Verfolgung – hier wird KEIN Casino-Geld
// gutgeschrieben (die Belohnung erfolgt InGame als echtes Geld / RP-Auszahlung).
const MISSION_PURSUIT_METRICS = new Set([
  "missions_total",
  "pursuits_total",
  "pursuits_week",
  "protocols_total",
]);

export async function awardAchievements(userId: string, userName: string, dienstnummer?: string | null) {
  // Awarding now happens server-side (RLS forbids self-insert on user_achievements).
  // Edge function validates JWT, recomputes metrics from trusted DB queries,
  // and writes via service role.
  try {
    const { data, error } = await supabase.functions.invoke("award-achievements", {
      body: {},
    });
    if (error) throw error;
    return {
      newlyAwarded: (data as any)?.newlyAwarded ?? 0,
      metrics: ((data as any)?.metrics ?? (await computeMetrics(userId, userName, dienstnummer))) as MetricSnapshot,
    };
  } catch (e) {
    console.error("award-achievements invoke failed:", e);
    return { newlyAwarded: 0, metrics: await computeMetrics(userId, userName, dienstnummer) };
  }
}