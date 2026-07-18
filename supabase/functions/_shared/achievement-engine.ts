import { countHeliTeilnehmerForUser } from "./mission-stats.ts";

// Wöchentlicher Reset für "diese Woche"-Metriken: jeden Sonntag 20:00 Uhr
// Berlin-Zeit. Muss identisch zu src/lib/weekBoundary.ts bleiben.
function getBerlinOffsetMs(date: Date): number {
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const berlinAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinAsLocal.getTime() - utcAsLocal.getTime();
}

function getChallengeWeekStart(reference: Date = new Date()): Date {
  const offset = getBerlinOffsetMs(reference);
  const berlinNow = new Date(reference.getTime() + offset);
  const dayOfWeek = berlinNow.getUTCDay();
  const candidate = new Date(berlinNow);
  candidate.setUTCDate(candidate.getUTCDate() - dayOfWeek);
  candidate.setUTCHours(20, 0, 0, 0);
  if (candidate.getTime() > berlinNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }
  return new Date(candidate.getTime() - offset);
}

const TIER_REWARDS: Record<string, number> = {
  bronze: 5_000, silver: 10_000, gold: 25_000, platinum: 50_000, diamond: 100_000,
};
const MISSION_PURSUIT_METRICS = new Set(["missions_total", "pursuits_total", "pursuits_week", "protocols_total"]);
const MISSION_PARTICIPATION_METRICS = new Set(["crew_participations_total"]);
const NOTIFY_CODES = new Set(["missions_week_5", "pursuits_week_10"]);

/**
 * Prüft und vergibt Achievements für EINEN Nutzer (inkl. Casino-Belohnung und
 * Discord-Benachrichtigung für Wochenziel-Achievements). Wird sowohl vom
 * frontend-getriggerten award-achievements Endpoint als auch vom periodischen
 * award-achievements-batch Cron-Job genutzt, damit Achievements/Benachrichtigungen
 * auch dann ankommen, wenn der Nutzer die Achievements-Seite nie öffnet.
 */
export async function runAchievementCheckForUser(admin: any, userId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("name, dienstnummer")
    .eq("id", userId)
    .maybeSingle();
  const userName = profile?.name || "";
  const dienstnummer = profile?.dienstnummer ?? null;

  const weekStart = getChallengeWeekStart().toISOString();

  const [
    missionsRes, missionsWeekRes, pursuitsRes, pursuitsWeekRes,
    protocolsRes, crewMissionsRes, crewPursuitsRes, profilesRes, formationsRes, uebungenRes,
    theoryRes, practicalRes, balanceRes, challengesRes, jackpotRes,
  ] = await Promise.all([
    admin.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId),
    admin.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", weekStart),
    admin.from("pursuits").select("id", { count: "exact", head: true }).eq("created_by", userId),
    admin.from("pursuits").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", weekStart),
    admin.from("missions").select("id", { count: "exact", head: true }).eq("protokollschreiber", userId),
    admin.from("missions").select("co_pilot, left_gunner, right_gunner, protokollschreiber, created_by"),
    admin.from("pursuits").select("co_pilot, left_gunner, right_gunner, protokollschreiber, created_by"),
    admin.from("profiles").select("id, name"),
    admin.from("formation_protocols").select("id", { count: "exact", head: true }).eq("created_by", userId),
    admin.from("uebung_teilnahmen").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "zusage"),
    dienstnummer
      ? admin.from("theory_exam_results").select("id", { count: "exact", head: true }).eq("dienstnummer", dienstnummer).eq("status", "passed")
      : Promise.resolve({ count: 0 } as any),
    dienstnummer
      ? admin.from("practical_exam_results").select("id", { count: "exact", head: true }).eq("candidate_dienstnummer", dienstnummer).eq("status", "passed")
      : Promise.resolve({ count: 0 } as any),
    admin.from("casino_balances").select("balance").eq("user_id", userId).maybeSingle(),
    admin.from("challenge_completions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("activity_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("action", "casino_jackpot"),
  ]);

  const writerNameById = new Map<string, string>(
    ((profilesRes.data || []) as Array<{ id: string; name: string | null }>)
      .filter((p) => p.id && p.name)
      .map((p) => [p.id, p.name as string]),
  );

  const metrics = {
    missions_total: missionsRes.count || 0,
    missions_week: missionsWeekRes.count || 0,
    pursuits_total: pursuitsRes.count || 0,
    pursuits_week: pursuitsWeekRes.count || 0,
    protocols_total: protocolsRes.count || 0,
    crew_participations_total: countHeliTeilnehmerForUser(
      [...(crewMissionsRes.data || []), ...(crewPursuitsRes.data || [])] as any[],
      userName,
      userId,
      writerNameById,
    ),
    formations_total: formationsRes.count || 0,
    uebungen_attended: uebungenRes.count || 0,
    theory_passed: (theoryRes as any).count || 0,
    practical_passed: (practicalRes as any).count || 0,
    casino_jackpot: jackpotRes.count || 0,
    casino_balance: (balanceRes.data as any)?.balance || 0,
    challenges_total: challengesRes.count || 0,
  };

  const [{ data: defs }, { data: owned }] = await Promise.all([
    admin.from("achievement_definitions").select("*").eq("is_active", true),
    admin.from("user_achievements").select("achievement_code").eq("user_id", userId),
  ]);
  const ownedSet = new Set((owned || []).map((r: any) => r.achievement_code));

  const toAward: { user_id: string; achievement_code: string; progress_value: number }[] = [];
  for (const d of (defs || []) as any[]) {
    if (ownedSet.has(d.code)) continue;
    const value = (metrics as any)[d.metric] || 0;
    if (value >= d.threshold) {
      toAward.push({ user_id: userId, achievement_code: d.code, progress_value: value });
    }
  }

  let newlyAwarded = 0;
  if (toAward.length) {
    const { data: inserted } = await admin
      .from("user_achievements")
      .upsert(toAward, { onConflict: "user_id,achievement_code", ignoreDuplicates: true })
      .select("achievement_code");
    const insertedCodes = new Set((inserted || []).map((r: any) => r.achievement_code));
    newlyAwarded = insertedCodes.size;

    let casinoReward = 0;
    for (const a of toAward) {
      if (!insertedCodes.has(a.achievement_code)) continue;
      const def = (defs || []).find((d: any) => d.code === a.achievement_code);
      if (!def) continue;
      if (def.reward_amount == null && MISSION_PURSUIT_METRICS.has(def.metric)) continue;
      if (def.reward_amount == null && MISSION_PARTICIPATION_METRICS.has(def.metric)) continue;
      if (def.reward_amount != null) {
        casinoReward += def.reward_amount;
      } else {
        casinoReward += TIER_REWARDS[(def.tier || "").toLowerCase()] || 0;
      }
    }
    if (casinoReward > 0) {
      const { data: bal } = await admin.from("casino_balances").select("balance").eq("user_id", userId).maybeSingle();
      const current = (bal as any)?.balance ?? 0;
      const next = current + casinoReward;
      if (bal) {
        await admin.from("casino_balances").update({ balance: next }).eq("user_id", userId);
      } else {
        await admin.from("casino_balances").insert({ user_id: userId, balance: next });
      }
    }

    for (const a of toAward) {
      if (!insertedCodes.has(a.achievement_code)) continue;
      if (!NOTIFY_CODES.has(a.achievement_code)) continue;
      const def = (defs || []).find((d: any) => d.code === a.achievement_code);
      if (!def) continue;
      const tier = (def.tier || "").toLowerCase();
      const reward = MISSION_PURSUIT_METRICS.has(def.metric) ? 0 : (TIER_REWARDS[tier] || 0);
      try {
        await admin.functions.invoke("discord-notify", {
          body: {
            type: "achievement_unlocked",
            data: {
              user_id: userId,
              user_name: userName,
              dienstnummer,
              achievement_code: def.code,
              achievement_title: def.title,
              achievement_description: def.description,
              achievement_tier: def.tier,
              casino_reward: reward,
            },
          },
        });
      } catch (e) {
        console.error("Discord notify failed", e);
      }
    }
  }

  return { newlyAwarded, metrics };
}
