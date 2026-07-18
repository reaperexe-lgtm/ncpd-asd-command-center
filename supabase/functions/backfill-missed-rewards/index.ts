import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { runAchievementCheckForUser } from "../_shared/achievement-engine.ts";
import { reportAutomationFailure } from "../_shared/automation-alert.ts";

// EINMALIGER manueller Backfill (12.07.2026 Fix), NICHT als Cron eingerichtet.
// Grund: Seit dem Entfernen von checkWeeklyPerformance() aus EinsatzPage.tsx /
// VerfolgungPage.tsx liefen Achievement-Vergabe & Wochenziel-Auszahlung nur noch,
// wenn zufällig jemand die Achievements-Seite besucht hat. award-achievements-batch
// (Cron) holt den Achievement-Teil ohnehin periodisch nach — dieser Endpoint deckt
// zusätzlich den Wochenziel-Teil ab (Einsatz-Sprint / Verfolgungs-Marathon aus
// weekly_challenges), der sonst NICHT von einem Cron abgedeckt ist.
//
// WICHTIG: missions_week / pursuits_week sind Live-Zähler, die beim Wochenreset
// (Sonntag 20 Uhr Berlin) auf 0 fallen. Dieser Endpoint kann daher nur die
// AKTUELL laufende Woche nachträglich auswerten — für bereits vergangene,
// zurückgesetzte Wochen sind verpasste Wochenziele nicht mehr rekonstruierbar.
//
// Aufruf (danach kann die Function wieder entfernt werden):
//   curl.exe -X POST https://zoidbkodbnmtdiauruqm.supabase.co/functions/v1/backfill-missed-rewards \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

function getBerlinOffsetMs(date: Date): number {
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const berlinAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinAsLocal.getTime() - utcAsLocal.getTime();
}

function getChallengeWeekStartDateKey(reference: Date = new Date()): string {
  const offset = getBerlinOffsetMs(reference);
  const berlinNow = new Date(reference.getTime() + offset);
  const dayOfWeek = berlinNow.getUTCDay();
  const candidate = new Date(berlinNow);
  candidate.setUTCDate(candidate.getUTCDate() - dayOfWeek);
  candidate.setUTCHours(20, 0, 0, 0);
  if (candidate.getTime() > berlinNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }
  const y = candidate.getUTCFullYear();
  const m = String(candidate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(candidate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const REMOVED_CHALLENGE_TITLES = ["10-80-Sammler", "Missionen-Master"];
const getRewardDestination = (c: { title?: string }) =>
  c.title === "Einsatz-Sprint" || c.title === "Verfolgungs-Marathon" ? "cash" : "casino";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Bewusst NUR mit dem Service-Role-Key aufrufbar (kein normaler User-JWT) —
    // das ist ein einmaliger Admin-Backfill, kein Endpoint für reguläre Nutzer.
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    const errors: { user_id: string; message: string }[] = [];

    // --- Teil 1: Achievements (Lifetime-Metriken + Wochenziel-Achievement-Notify) ---
    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id, name, dienstnummer")
      .eq("is_approved", true)
      .eq("is_blocked", false);
    if (profilesErr) throw profilesErr;

    let achievementsAwarded = 0;
    for (const p of profiles || []) {
      try {
        const result = await runAchievementCheckForUser(admin, p.id);
        achievementsAwarded += result.newlyAwarded;
      } catch (e) {
        errors.push({ user_id: p.id, message: `achievements: ${e instanceof Error ? e.message : String(e)}` });
      }
    }

    // --- Teil 2: Wochenziele (Einsatz-Sprint / Verfolgungs-Marathon Cash-Auszahlung) ---
    const weekStartIso = getChallengeWeekStartDateKey();
    const { data: challenges, error: challengesErr } = await admin
      .from("weekly_challenges")
      .select("*")
      .eq("week_start", weekStartIso)
      .eq("is_active", true);
    if (challengesErr) throw challengesErr;

    const visibleChallenges = (challenges || []).filter(
      (c: any) => c.title !== "Aktiver Pilot" && !REMOVED_CHALLENGE_TITLES.includes(c.title),
    );

    let weeklyChallengesClaimed = 0;

    if (visibleChallenges.length && profiles?.length) {
      const weekStartTimestamp = new Date(`${weekStartIso}T00:00:00.000Z`).toISOString();
      // Grobfilter reicht hier: alle Missionen/Verfolgungen ab dem Kalendertag des
      // Wochenstarts holen und pro Nutzer clientseitig zählen (kleine Datenmenge,
      // einmaliger Lauf — kein Performance-kritischer Pfad).
      const [{ data: weekMissions }, { data: weekPursuits }] = await Promise.all([
        admin.from("missions").select("id, created_by, created_at").gte("created_at", weekStartTimestamp),
        admin.from("pursuits").select("id, created_by, pursuit_date").gte("pursuit_date", weekStartTimestamp),
      ]);

      for (const p of profiles || []) {
        try {
          const { data: completions } = await admin
            .from("challenge_completions")
            .select("*")
            .eq("user_id", p.id);

          const missionsWeek = (weekMissions || []).filter((m: any) => m.created_by === p.id).length;
          const pursuitsWeek = (weekPursuits || []).filter((m: any) => m.created_by === p.id).length;
          const metricValues: Record<string, number> = {
            missions_week: missionsWeek,
            pursuits_week: pursuitsWeek,
          };

          for (const c of visibleChallenges) {
            const value = metricValues[c.metric];
            if (value === undefined) continue; // nur missions_week/pursuits_week hier abgedeckt
            const existing = completions?.find((x: any) => x.challenge_id === c.id);
            if (existing?.reward_paid) continue;
            if (value < c.target) continue;

            await admin.from("challenge_completions").upsert(
              { challenge_id: c.id, user_id: p.id, reward_paid: false },
              { onConflict: "challenge_id,user_id" },
            );
            const { data: updated } = await admin
              .from("challenge_completions")
              .update({ reward_paid: true })
              .eq("challenge_id", c.id)
              .eq("user_id", p.id)
              .eq("reward_paid", false)
              .select("id");
            if (!updated || (Array.isArray(updated) && updated.length === 0)) continue;

            weeklyChallengesClaimed++;
            const destination = getRewardDestination(c);
            if (destination === "casino") {
              const { data: bal } = await admin.from("casino_balances").select("balance").eq("user_id", p.id).maybeSingle();
              const newBal = ((bal as any)?.balance || 0) + c.reward_amount;
              await admin.from("casino_balances").upsert({ user_id: p.id, balance: newBal } as any, { onConflict: "user_id" });
            } else {
              try {
                await admin.functions.invoke("discord-notify", {
                  body: {
                    type: "challenge_completed",
                    data: {
                      user_id: p.id,
                      user_name: p.name || "",
                      dienstnummer: p.dienstnummer ?? null,
                      challenge_title: c.title,
                      challenge_description: c.description,
                      reward_amount: c.reward_amount,
                    },
                  },
                });
              } catch (e) {
                console.error("discord-notify failed for backfill", e);
              }
            }
          }
        } catch (e) {
          errors.push({ user_id: p.id, message: `weekly_challenges: ${e instanceof Error ? e.message : String(e)}` });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: (profiles || []).length,
        achievements_awarded: achievementsAwarded,
        weekly_challenges_claimed: weeklyChallengesClaimed,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    await reportAutomationFailure("backfill-missed-rewards", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
