import { supabase } from "@/integrations/supabase/client";

/**
 * Berechnet alle Achievement-Metriken für einen User und schaltet
 * die jeweils erreichten Badges frei. Wird beim Laden der Achievements-Seite
 * UND nach jedem relevanten Event (Mission, Verfolgung, etc.) aufgerufen.
 */
export type Metric =
  | "missions_total"
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

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=So
  d.setDate(d.getDate() - day);
  return d;
};

export async function computeMetrics(userId: string, userName: string, dienstnummer?: string | null): Promise<MetricSnapshot> {
  const weekStart = startOfWeek().toISOString();

  const [missionsRes, pursuitsRes, pursuitsWeekRes, protocolsRes, formationsRes, uebungenRes, theoryRes, practicalRes, balanceRes, challengesRes] = await Promise.all([
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId),
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

export async function awardAchievements(userId: string, userName: string, dienstnummer?: string | null) {
  const [defsRes, ownedRes] = await Promise.all([
    supabase.from("achievement_definitions").select("*").eq("is_active", true),
    supabase.from("user_achievements").select("achievement_code").eq("user_id", userId),
  ]);
  const defs = defsRes.data || [];
  const owned = new Set((ownedRes.data || []).map((a: any) => a.achievement_code));
  const metrics = await computeMetrics(userId, userName, dienstnummer);

  const toAward: { user_id: string; achievement_code: string; progress_value: number }[] = [];
  for (const d of defs) {
    if (owned.has(d.code)) continue;
    const value = (metrics as any)[d.metric] || 0;
    if (value >= d.threshold) {
      toAward.push({ user_id: userId, achievement_code: d.code, progress_value: value });
    }
  }

  if (toAward.length) {
    await supabase.from("user_achievements").insert(toAward);

    // Fire Discord notification for each newly awarded achievement (DM to user + ping ASD-Leitung in channel)
    for (const award of toAward) {
      const def = defs.find((d: any) => d.code === award.achievement_code);
      if (!def) continue;
      try {
        await supabase.functions.invoke("discord-notify", {
          body: {
            type: "achievement_unlocked",
            data: {
              user_id: userId,
              user_name: userName,
              dienstnummer: dienstnummer ?? null,
              achievement_code: def.code,
              achievement_title: def.title,
              achievement_description: def.description,
              achievement_tier: def.tier,
            },
          },
        });
      } catch (e) {
        console.error("Failed to send achievement Discord notification:", e);
      }
    }
  }
  return { newlyAwarded: toAward.length, metrics };
}