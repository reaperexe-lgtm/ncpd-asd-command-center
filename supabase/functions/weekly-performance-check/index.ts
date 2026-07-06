import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const MISSION_THRESHOLD = 5;
const PURSUIT_THRESHOLD = 10;
const REWARD_AMOUNT = 50000;

function getASDWeekStart(): Date {
  // ASD week resets Sunday 18:20 Europe/Berlin. We approximate using the server (UTC)
  // by working in Europe/Berlin via toLocaleString. Sufficient for week bucketing.
  const now = new Date();
  const berlinNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const day = berlinNow.getDay();
  const sunday = new Date(berlinNow);
  sunday.setDate(berlinNow.getDate() - day);
  sunday.setHours(18, 20, 0, 0);
  if (berlinNow < sunday) sunday.setDate(sunday.getDate() - 7);
  // convert berlin-time wallclock back to absolute by computing offset
  const offsetMs = berlinNow.getTime() - now.getTime();
  const weekStart = new Date(sunday.getTime() - offsetMs);
  weekStart.setUTCSeconds(0, 0);
  return weekStart;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weekStart = getASDWeekStart();
    const normalizedWeekStart = weekStart.toISOString();

    // Already paid?
    const { data: existing } = await supabase
      .from("weekly_performance_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start", normalizedWeekStart)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ already_paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check resets that may push the effective week start later
    const { data: resets } = await supabase
      .from("stats_resets")
      .select("reset_type, reset_at")
      .order("reset_at", { ascending: false });
    const lastWeekly = resets?.find((r: any) => r.reset_type === "weekly")?.reset_at;
    const lastPursuit = resets?.find((r: any) => r.reset_type === "pursuits")?.reset_at;
    const effectiveMissionStart = lastWeekly && new Date(lastWeekly) > weekStart
      ? new Date(lastWeekly) : weekStart;
    const effectivePursuitStart = lastPursuit && new Date(lastPursuit) > effectiveMissionStart
      ? new Date(lastPursuit) : effectiveMissionStart;

    // Count missions and pursuits for this user since the effective starts
    const [{ count: missionsCount }, { count: pursuitsCount }] = await Promise.all([
      supabase.from("missions").select("id", { count: "exact", head: true })
        .eq("protokollschreiber", user.id)
        .gte("tatzeit", effectiveMissionStart.toISOString()),
      supabase.from("pursuits").select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("pursuit_date", effectivePursuitStart.toISOString()),
    ]);

    const missions = missionsCount || 0;
    const pursuits = pursuitsCount || 0;
    const missionHit = missions >= MISSION_THRESHOLD;
    const pursuitHit = pursuits >= PURSUIT_THRESHOLD;

    if (!missionHit && !pursuitHit) {
      return new Response(JSON.stringify({ qualified: false, missions, pursuits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggeredBy = missionHit && pursuitHit ? "both" : missionHit ? "missions" : "pursuits";

    // Insert reward row first (atomic guard against duplicates)
    const { error: insertError } = await supabase
      .from("weekly_performance_rewards")
      .insert({
        user_id: user.id,
        week_start: normalizedWeekStart,
        missions_count: missions,
        pursuits_count: pursuits,
        triggered_by: triggeredBy,
      });

    if (insertError) {
      // Likely a race -> already paid
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ already_paid: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw insertError;
    }

    // Get user profile for messaging
    const [{ data: profileBase }, { data: profilePriv }] = await Promise.all([
      supabase.from("profiles").select("name, dienstnummer").eq("id", user.id).maybeSingle(),
      supabase.from("profiles_private").select("discord_id").eq("user_id", user.id).maybeSingle(),
    ]);
    const profile = profileBase ? { ...profileBase, discord_id: profilePriv?.discord_id ?? null } : null;

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const DISCORD_API = "https://discord.com/api/v10";

    async function sendDM(discordId: string, message: string) {
      const ch = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: "POST",
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: discordId }),
      });
      if (!ch.ok) throw new Error(await ch.text());
      const channel = await ch.json();
      const m = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      if (!m.ok) throw new Error(await m.text());
    }

    const reasonText = triggeredBy === "both"
      ? `${missions} Einsätze **und** ${pursuits} Verfolgungen`
      : triggeredBy === "missions"
        ? `${missions} Einsätze`
        : `${pursuits} Verfolgungen`;

    const userMsg = [
      `🎉 **Glückwunsch, ${profile?.name ?? "Kollege"}!**`,
      ``,
      `Du hast diese Woche **${reasonText}** absolviert und damit die Wochen-Leistungsbelohnung freigeschaltet.`,
      ``,
      `💰 **Belohnung: ${REWARD_AMOUNT.toLocaleString("de-DE")}$**`,
      `Bitte melde dich bei der **ASD Direction**, um deine Auszahlung zu erhalten.`,
    ].join("\n");

    const dnLabel = profile?.dienstnummer ? ` (#${profile.dienstnummer})` : "";
    const directionMsg = [
      `💸 **Wochen-Leistungsbelohnung fällig**`,
      ``,
      `**${profile?.name ?? "Unbekannt"}${dnLabel}** hat diese Woche **${reasonText}** absolviert.`,
      ``,
      `➡️ Bitte **${REWARD_AMOUNT.toLocaleString("de-DE")}$** auszahlen.`,
    ].join("\n");

    const results: any = { user_dm: null, direction_dms: [] };

    if (botToken && profile?.discord_id) {
      try {
        await sendDM(profile.discord_id, userMsg);
        results.user_dm = "sent";
      } catch (e) {
        results.user_dm = `failed: ${(e as Error).message}`;
      }
    }

    if (botToken) {
      const { data: directionRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["director", "co_director"]);
      const ids = (directionRoles || []).map((r: any) => r.user_id);
      if (ids.length > 0) {
        const [{ data: dirNames }, { data: dirPriv }] = await Promise.all([
          supabase.from("profiles").select("id, name").in("id", ids),
          supabase.from("profiles_private").select("user_id, discord_id").in("user_id", ids).not("discord_id", "is", null),
        ]);
        const dNameMap: Record<string, string> = {};
        for (const p of dirNames || []) dNameMap[(p as any).id] = (p as any).name;
        const directionProfiles = (dirPriv || []).map((r: any) => ({
          discord_id: r.discord_id,
          name: dNameMap[r.user_id] ?? "Direction",
        }));
        for (const p of directionProfiles || []) {
          try {
            await sendDM(p.discord_id!, directionMsg);
            results.direction_dms.push({ name: p.name, status: "sent" });
          } catch (e) {
            results.direction_dms.push({ name: p.name, status: "failed", error: (e as Error).message });
          }
        }
      }
    }

    // Activity log
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "weekly_performance_reward_granted",
      category: "rewards",
      details: { missions, pursuits, triggered_by: triggeredBy, amount: REWARD_AMOUNT },
    });

    return new Response(JSON.stringify({
      qualified: true, missions, pursuits, triggered_by: triggeredBy, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});