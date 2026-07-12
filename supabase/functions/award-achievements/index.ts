import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Wöchentlicher Reset für "diese Woche"-Metriken (Einsatz-Sprint, Verfolgungs-Marathon,
// pursuits_week Achievements): jeden Sonntag 20:00 Uhr Berlin-Zeit, nicht Mitternacht.
// Muss identisch zu src/lib/weekBoundary.ts bleiben.
function getBerlinOffsetMs(date: Date): number {
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const berlinAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinAsLocal.getTime() - utcAsLocal.getTime();
}

function getChallengeWeekStart(reference: Date = new Date()): Date {
  const offset = getBerlinOffsetMs(reference);
  const berlinNow = new Date(reference.getTime() + offset);

  const dayOfWeek = berlinNow.getUTCDay(); // 0 = Sonntag
  const candidate = new Date(berlinNow);
  candidate.setUTCDate(candidate.getUTCDate() - dayOfWeek);
  candidate.setUTCHours(20, 0, 0, 0);

  if (candidate.getTime() > berlinNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }

  return new Date(candidate.getTime() - offset);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load profile (name + dienstnummer) server-side — never trust client.
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
      protocolsRes, formationsRes, uebungenRes,
      theoryRes, practicalRes, balanceRes, challengesRes, jackpotRes,
    ] = await Promise.all([
      admin.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId),
      admin.from("missions").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", weekStart),
      admin.from("pursuits").select("id", { count: "exact", head: true }).eq("created_by", userId),
      admin.from("pursuits").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", weekStart),
      admin.from("missions").select("id", { count: "exact", head: true }).eq("protokollschreiber", userId),
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

    const metrics = {
      missions_total: missionsRes.count || 0,
      missions_week: missionsWeekRes.count || 0,
      pursuits_total: pursuitsRes.count || 0,
      pursuits_week: pursuitsWeekRes.count || 0,
      protocols_total: protocolsRes.count || 0,
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

    const TIER_REWARDS: Record<string, number> = {
      bronze: 5_000, silver: 10_000, gold: 25_000, platinum: 50_000, diamond: 100_000,
    };
    const MISSION_PURSUIT_METRICS = new Set([
      "missions_total", "pursuits_total", "pursuits_week", "protocols_total",
    ]);

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

      // Casino reward
      let casinoReward = 0;
      for (const a of toAward) {
        if (!insertedCodes.has(a.achievement_code)) continue;
        const def = (defs || []).find((d: any) => d.code === a.achievement_code);
        if (!def || MISSION_PURSUIT_METRICS.has(def.metric)) continue;
        casinoReward += TIER_REWARDS[(def.tier || "").toLowerCase()] || 0;
      }
      if (casinoReward > 0) {
        const { data: bal } = await admin
          .from("casino_balances").select("balance").eq("user_id", userId).maybeSingle();
        const current = (bal as any)?.balance ?? 0;
        const next = current + casinoReward;
        if (bal) {
          await admin.from("casino_balances").update({ balance: next }).eq("user_id", userId);
        } else {
          await admin.from("casino_balances").insert({ user_id: userId, balance: next });
        }
      }

      const NOTIFY_CODES = new Set(["missions_week_5", "pursuits_week_10"]);
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

    return new Response(JSON.stringify({ newlyAwarded, metrics }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("award-achievements error", e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
