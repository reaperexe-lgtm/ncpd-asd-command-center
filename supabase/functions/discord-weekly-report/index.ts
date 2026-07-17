import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reportAutomationFailure } from "../_shared/automation-alert.ts";

const DISCORD_API = "https://discord.com/api/v10";

async function getTopProtokollschreiber(supabaseAdmin: any, startDate: Date, now: Date) {
  const { data: missions } = await supabaseAdmin
    .from("missions")
    .select("protokollschreiber")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", now.toISOString())
    .not("protokollschreiber", "is", null);

  const { data: pursuits } = await supabaseAdmin
    .from("pursuits")
    .select("created_by")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", now.toISOString());

  const counts: Record<string, { missions: number; pursuits: number }> = {};

  for (const m of missions || []) {
    if (m.protokollschreiber) {
      if (!counts[m.protokollschreiber]) counts[m.protokollschreiber] = { missions: 0, pursuits: 0 };
      counts[m.protokollschreiber].missions++;
    }
  }

  for (const p of pursuits || []) {
    if (p.created_by) {
      if (!counts[p.created_by]) counts[p.created_by] = { missions: 0, pursuits: 0 };
      counts[p.created_by].pursuits++;
    }
  }

  const userIds = Object.keys(counts);
  let profileMap: Record<string, { name: string; discord_id: string | null }> = {};
  if (userIds.length > 0) {
    const [{ data: profiles }, { data: privateRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name").in("id", userIds),
      supabaseAdmin.from("profiles_private").select("user_id, discord_id").in("user_id", userIds),
    ]);
    const discordMap: Record<string, string | null> = {};
    for (const r of privateRows || []) discordMap[(r as any).user_id] = (r as any).discord_id ?? null;
    for (const p of profiles || []) {
      profileMap[p.id] = { name: p.name, discord_id: discordMap[p.id] ?? null };
    }
  }

  const sorted = Object.entries(counts)
    .map(([userId, c]) => ({
      userId,
      name: profileMap[userId]?.name || "Unbekannt",
      discord_id: profileMap[userId]?.discord_id || null,
      total: c.missions + c.pursuits,
      missions: c.missions,
      pursuits: c.pursuits,
    }))
    .sort((a, b) => b.total - a.total);

  return { sorted, totalMissions: missions?.length || 0, totalPursuits: pursuits?.length || 0 };
}

// Prüft, ob es gerade 12 Uhr (Stunde 12) Berlin-Zeit ist — unabhängig von
// Sommer-/Winterzeit. Der Cron-Job ruft diese Function zweimal auf
// (10 Uhr und 11 Uhr UTC), damit exakt ein Aufruf pro Woche wirklich zutrifft.
function isNoonInBerlin(now: Date): boolean {
  const berlinHour = Number(
    new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }).format(now),
  );
  return berlinHour === 12;
}

function getAsdWeekStart(now: Date): Date {
  const startDate = new Date(now);
  const dayOfWeek = now.getDay();
  startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek));
  startDate.setHours(18, 20, 0, 0);
  if (now < startDate) {
    startDate.setDate(startDate.getDate() - 7);
  }
  return startDate;
}

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const channelId = Deno.env.get("DISCORD_CHANNEL_ID");

    if (!botToken || !channelId) {
      return new Response(JSON.stringify({ error: "Missing DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID" }), { status: 500 });
    }

    const now = new Date();

    // Der Cron-Job ruft diese Function 2x an, um Sommer-/Winterzeit abzudecken
    // (10 Uhr & 11 Uhr UTC). Nur der Aufruf, der wirklich 12 Uhr Berlin-Zeit
    // trifft, postet tatsächlich. Mit ?force=true (manueller Test) wird das
    // ignoriert und sofort gepostet.
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    if (!force && !isNoonInBerlin(now)) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "not 12:00 Europe/Berlin yet" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const weekStart = getAsdWeekStart(now);

    const { sorted, totalMissions, totalPursuits } = await getTopProtokollschreiber(supabaseAdmin, weekStart, now);

    // Load Director & Co-Director Discord IDs to ping at top of report
    let pingPrefix = "";
    try {
      const { data: pingRows } = await supabaseAdmin
        .from("permission_settings")
        .select("permission_key, role")
        .in("permission_key", ["stats_ping_director_id", "stats_ping_codirector_id"]);
      const pings: string[] = [];
      for (const r of pingRows || []) {
        const id = (r as any).role?.trim();
        if (id) pings.push(`<@${id}>`);
      }
      if (pings.length) pingPrefix = pings.join(" ") + "\n";
    } catch (_) { /* ignore */ }

    const medals = ["🥇", "🥈", "🥉"];
    let leaderboard = "";
    sorted.slice(0, 15).forEach((entry, idx) => {
      const prefix = idx < 3 ? medals[idx] : `**${idx + 1}.**`;
      const displayName = entry.discord_id ? `<@${entry.discord_id}>` : `**${entry.name}**`;
      leaderboard += `${prefix} ${displayName} — ${entry.total} Protokoll${entry.total !== 1 ? "e" : ""} (📋 ${entry.missions} + 🚔 ${entry.pursuits})\n`;
    });

    if (!leaderboard) leaderboard = "Keine Protokolle in diesem Zeitraum.\n";

    const message = [
      pingPrefix.trim(),
      `📊 **Automatischer Wochenbericht — Top-Protokollschreiber**`,
      `━━━━━━━━━━━━━━━`,
      leaderboard.trim(),
      ``,
      `📅 ASD-Woche: ${weekStart.toLocaleDateString("de-DE")} – ${now.toLocaleDateString("de-DE")}`,
      `📝 Gesamt: **${totalMissions + totalPursuits}** Protokolle (📋 ${totalMissions} Einsätze + 🚔 ${totalPursuits} 10-80)`,
      ``,
      `_Automatisch gesendet am ${now.toLocaleDateString("de-DE")} um ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} Uhr_`,
    ].filter(Boolean).join("\n");

    const discordRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error("Discord error:", errText);
      return new Response(JSON.stringify({ error: "Discord API error", details: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: "Weekly report sent" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    await reportAutomationFailure("discord-weekly-report", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
