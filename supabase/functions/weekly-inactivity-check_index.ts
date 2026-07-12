import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

// Alle "festen" ASD-Mitglieder — analog zu uebung-reminders.
// Admins, Team-Red, Bewerber & reine Flight-Mitglieder werden nicht geprüft.
const ASD_ROLES = [
  "director",
  "co_director",
  "supervisor",
  "ausbilder",
  "trial_ausbilder",
  "member",
  "trial_member",
];

function sanitizeDiscordId(raw?: string | null): string {
  if (!raw) return "";
  return String(raw).replace(/[^0-9]/g, "");
}

async function sendDM(botToken: string, discordId: string, message: string) {
  const clean = sanitizeDiscordId(discordId);
  if (!/^\d{17,20}$/.test(clean)) throw new Error(`Invalid Discord ID: ${discordId}`);
  const chRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: clean }),
  });
  if (!chRes.ok) throw new Error(`DM channel failed: ${await chRes.text()}`);
  const channel = await chRes.json();
  const msgRes = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!msgRes.ok) throw new Error(`DM send failed: ${await msgRes.text()}`);
}

async function sendChannelMessage(botToken: string, channelId: string, message: string) {
  const clean = sanitizeDiscordId(channelId);
  if (!/^\d{17,20}$/.test(clean)) throw new Error(`Ungültige Discord Channel-ID: ${channelId}`);
  const msgRes = await fetch(`${DISCORD_API}/channels/${clean}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      content: message,
      allowed_mentions: { parse: ["users"] },
    }),
  });
  if (!msgRes.ok) throw new Error(`Channel-Nachricht fehlgeschlagen (${clean}): ${await msgRes.text()}`);
  return await msgRes.json();
}

// Prüft, ob "jetzt" ungefähr der wöchentliche ASD-Reset-Zeitpunkt ist
// (Sonntag 18:20 Europe/Berlin). Der Cron-Job ruft diese Function zweimal auf
// (Sommer-/Winterzeit), damit trotz DST genau ein Aufruf pro Woche wirklich zutrifft.
function isResetHourInBerlin(now: Date): boolean {
  const berlinHour = Number(
    new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }).format(now),
  );
  return berlinHour === 18;
}

// Liefert Start & Ende der zuletzt abgeschlossenen ASD-Woche
// (Sonntag 18:20 Europe/Berlin bis zum nächsten Sonntag 18:20).
function getLastCompletedAsdWeek(now: Date): { weekStart: Date; weekEnd: Date } {
  const berlinNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const day = berlinNow.getDay();
  const sunday = new Date(berlinNow);
  sunday.setDate(berlinNow.getDate() - day);
  sunday.setHours(18, 20, 0, 0);
  if (berlinNow < sunday) sunday.setDate(sunday.getDate() - 7);
  const offsetMs = berlinNow.getTime() - now.getTime();
  const weekEnd = new Date(sunday.getTime() - offsetMs);
  weekEnd.setUTCSeconds(0, 0);
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 3600 * 1000);
  return { weekStart, weekEnd };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_BOT_TOKEN not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* kein Body */ }
    const dryRun = body?.dry_run === true;
    const force = body?.force === true;
    const testUserId = body?.test_user_id as string | undefined;

    const now = new Date();

    // Regulärer Cron-Aufruf: nur zum Reset-Zeitpunkt wirklich ausführen
    // (verhindert Doppel-Versand durch die Sommer-/Winterzeit-Cronjobs).
    if (!force && !testUserId && !isResetHourInBerlin(now)) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "not reset hour (18:xx Europe/Berlin) yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Feature-Schalter (Admin Panel)
    if (!testUserId && !force) {
      const { data: enabledRow } = await supabase
        .from("permission_settings")
        .select("role")
        .eq("permission_key", "inactivity_check_enabled")
        .maybeSingle();
      if (enabledRow && enabledRow.role === "false") {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "inactivity_check_enabled = false" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { weekStart, weekEnd } = getLastCompletedAsdWeek(now);

    // Manuelle Zwischen-Resets berücksichtigen (wie bei weekly-performance-check)
    const { data: resets } = await supabase
      .from("stats_resets")
      .select("reset_type, reset_at")
      .order("reset_at", { ascending: false });
    const lastWeekly = resets?.find((r: any) => r.reset_type === "weekly")?.reset_at;
    const lastPursuit = resets?.find((r: any) => r.reset_type === "pursuits")?.reset_at;
    let effectiveMissionStart = lastWeekly && new Date(lastWeekly) > weekStart ? new Date(lastWeekly) : weekStart;
    let effectivePursuitStart = lastPursuit && new Date(lastPursuit) > weekStart ? new Date(lastPursuit) : weekStart;
    if (effectiveMissionStart > weekEnd) effectiveMissionStart = weekStart;
    if (effectivePursuitStart > weekEnd) effectivePursuitStart = weekStart;

    // --- Testmodus: einzelne Test-DM ---
    if (testUserId) {
      const [{ data: pp }, { data: pv }] = await Promise.all([
        supabase.from("profiles").select("id, name, dienstnummer").eq("id", testUserId).maybeSingle(),
        supabase.from("profiles_private").select("discord_id").eq("user_id", testUserId).maybeSingle(),
      ]);
      if (!pv?.discord_id) {
        return new Response(JSON.stringify({ success: false, error: "Kein discord_id für diesen Nutzer hinterlegt" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const msg = buildUserMessage(pp?.name ?? "Kollege", true);
      try {
        await sendDM(botToken, pv.discord_id, msg);
        return new Response(JSON.stringify({ success: true, test: true, sent_to: pp?.name }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, test: true, error: e.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Mitglieder ermitteln ---
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ASD_ROLES);
    const asdUserIds = Array.from(new Set((roleRows || []).map((r: any) => r.user_id)));

    let members: { id: string; name: string; dienstnummer: string | null; discord_id: string | null; created_at: string }[] = [];
    if (asdUserIds.length) {
      const [{ data: pRows }, { data: pvRows }] = await Promise.all([
        supabase.from("profiles").select("id, name, dienstnummer, created_at").eq("is_approved", true).in("id", asdUserIds),
        supabase.from("profiles_private").select("user_id, discord_id").in("user_id", asdUserIds).not("discord_id", "is", null),
      ]);
      const dMap: Record<string, string> = {};
      for (const r of pvRows || []) dMap[(r as any).user_id] = (r as any).discord_id;
      members = (pRows || [])
        .map((r: any) => ({ id: r.id, name: r.name, dienstnummer: r.dienstnummer ?? null, discord_id: dMap[r.id] ?? null, created_at: r.created_at }))
        // Neuzugänge, die erst während/nach der geprüften Woche beigetreten sind, ausnehmen
        .filter((m: any) => m.discord_id && new Date(m.created_at) <= weekStart);
    }

    // --- Missions & Pursuits pro Nutzer für die geprüfte Woche zählen ---
    const [{ data: missions }, { data: pursuits }] = await Promise.all([
      supabase.from("missions").select("protokollschreiber")
        .gte("tatzeit", effectiveMissionStart.toISOString()).lt("tatzeit", weekEnd.toISOString())
        .not("protokollschreiber", "is", null),
      supabase.from("pursuits").select("created_by")
        .gte("pursuit_date", effectivePursuitStart.toISOString()).lt("pursuit_date", weekEnd.toISOString()),
    ]);

    const missionCounts: Record<string, number> = {};
    for (const m of missions || []) missionCounts[(m as any).protokollschreiber] = (missionCounts[(m as any).protokollschreiber] || 0) + 1;
    const pursuitCounts: Record<string, number> = {};
    for (const p of pursuits || []) pursuitCounts[(p as any).created_by] = (pursuitCounts[(p as any).created_by] || 0) + 1;

    const inactive = members.filter((m) => !missionCounts[m.id] && !pursuitCounts[m.id]);

    if (inactive.length === 0) {
      return new Response(JSON.stringify({
        success: true, checked: members.length, inactive: 0,
        week_start: weekStart.toISOString(), week_end: weekEnd.toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const weekStartIso = weekStart.toISOString();
    const results: any = { user_dms: [], director_ping: null };
    const trulyInactive: typeof inactive = [];

    for (const m of inactive) {
      if (dryRun) {
        trulyInactive.push(m);
        continue;
      }
      // Atomarer Guard gegen Doppel-Versand bei erneutem Lauf
      const { error: insertError } = await supabase
        .from("weekly_inactivity_warnings")
        .insert({ user_id: m.id, week_start: weekStartIso, missions_count: 0, pursuits_count: 0 });
      if (insertError) {
        if (insertError.code === "23505") continue; // bereits verwarnt
        results.user_dms.push({ name: m.name, status: "db_error", error: insertError.message });
        continue;
      }
      trulyInactive.push(m);
      try {
        await sendDM(botToken, m.discord_id!, buildUserMessage(m.name, false));
        results.user_dms.push({ name: m.name, status: "sent" });
      } catch (e) {
        results.user_dms.push({ name: m.name, status: "failed", error: (e as Error).message });
      }
      await supabase.from("activity_logs").insert({
        user_id: m.id,
        action: "weekly_inactivity_warning_sent",
        category: "warnings",
        details: { week_start: weekStartIso, week_end: weekEnd.toISOString() },
      });
    }

    if (trulyInactive.length > 0) {
      const { data: pingRows } = await supabase
        .from("permission_settings")
        .select("permission_key, role")
        .in("permission_key", ["stats_ping_director_id", "stats_ping_codirector_id", "inactivity_director_channel_id"]);
      const pingMap: Record<string, string> = {};
      for (const r of pingRows || []) pingMap[(r as any).permission_key] = ((r as any).role || "").trim();

      const pings = [pingMap["stats_ping_director_id"], pingMap["stats_ping_codirector_id"]]
        .filter((id) => /^\d{17,20}$/.test(id || ""))
        .map((id) => `<@${id}>`);
      const pingPrefix = pings.length ? pings.join(" ") + "\n" : "";

      const list = trulyInactive
        .map((m) => `• ${m.discord_id ? `<@${m.discord_id}>` : `**${m.name}**`}${m.dienstnummer ? ` (#${m.dienstnummer})` : ""}`)
        .join("\n");

      const channelMsg = [
        pingPrefix.trim(),
        `⚠️ **Wöchentliche Inaktivitäts-Meldung**${dryRun ? " _(Vorschau)_" : ""}`,
        `━━━━━━━━━━━━━━━`,
        `Folgende ASD-Mitglieder haben in der Woche vom **${weekStart.toLocaleDateString("de-DE")}** bis **${weekEnd.toLocaleDateString("de-DE")}** keinerlei Einsätze oder Verfolgungen protokolliert:`,
        ``,
        list,
        ``,
        `Bitte in Rücksprache mit den Mitgliedern klären.`,
      ].filter(Boolean).join("\n");

      const channelId = pingMap["inactivity_director_channel_id"] || Deno.env.get("DISCORD_DIRECTOR_CHANNEL_ID") || "";
      if (channelId && !dryRun) {
        try {
          await sendChannelMessage(botToken, channelId, channelMsg);
          results.director_ping = { status: "sent", channel_id: channelId, count: trulyInactive.length };
        } catch (e) {
          results.director_ping = { status: "failed", error: (e as Error).message };
        }
      } else if (!channelId) {
        results.director_ping = { status: "skipped", reason: "inactivity_director_channel_id nicht konfiguriert" };
      } else {
        results.director_ping = { status: "dry_run", preview: channelMsg };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dry_run: dryRun,
      checked: members.length,
      inactive: trulyInactive.length,
      week_start: weekStartIso,
      week_end: weekEnd.toISOString(),
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildUserMessage(name: string, isTest: boolean): string {
  return [
    `⚠️ **Wochenrückblick — Keine Aktivität**${isTest ? " _(Test)_" : ""}`,
    `━━━━━━━━━━━━━━━`,
    `Hallo ${name},`,
    ``,
    `du hast diese Woche **keine Einsätze oder Verfolgungen** protokolliert.`,
    `Das entspricht **nicht** der Arbeitsmoral, die sich die **ASD Direction** von ihren Mitgliedern wünscht.`,
    ``,
    `Bitte steigere deine Aktivität in der kommenden Woche. Solltest du Gründe (Urlaub, Krankheit, private Umstände o. Ä.) haben, melde dich bitte proaktiv bei der ASD Direction.`,
  ].join("\n");
}
