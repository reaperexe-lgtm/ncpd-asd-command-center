import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { reportAutomationFailure } from "../_shared/automation-alert.ts";

const DISCORD_API = "https://discord.com/api/v10";
const SANCTION_REASON_CHANNEL_ID = "1399063415049424966";

function sanitizeDiscordId(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  const mentionMatch = raw.match(/^<@!?(\d{17,20})>$/);
  if (mentionMatch) return mentionMatch[1];
  return raw.replace(/\D/g, "");
}

function mentionOrName(discordId: string | null | undefined, fallbackName: string) {
  const clean = sanitizeDiscordId(discordId);
  return /^\d{17,20}$/.test(clean) ? `<@${clean}>` : fallbackName;
}

function formatAmount(amount: number) {
  return `$${Math.round(amount).toLocaleString("de-DE")}`;
}

async function sendChannelMessage(botToken: string, channelId: string, payload: Record<string, unknown>) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Discord-Nachricht fehlgeschlagen: ${await res.text()}`);
  return await res.json();
}

async function loadDirectionMentions(supabaseAdmin: any) {
  const { data: directionRoles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .in("role", ["director", "co_director"]);

  const directionIds = (directionRoles || []).map((r: any) => r.user_id);
  if (directionIds.length === 0) return [];

  const { data: directionPrivate } = await supabaseAdmin
    .from("profiles_private")
    .select("user_id, discord_id")
    .in("user_id", directionIds);

  return (directionPrivate || [])
    .map((r: any) => sanitizeDiscordId(r.discord_id))
    .filter((id: string) => /^\d{17,20}$/.test(id));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_BOT_TOKEN nicht konfiguriert");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: { force?: boolean } = {};
    try { body = await req.json(); } catch { /* ignore, no body sent by cron */ }
    const force = body?.force === true;

    // Der Cron-Job ruft diese Function 2x täglich auf (07 & 08 Uhr UTC), um
    // Sommer-/Winterzeit abzudecken. Nur der Aufruf, der wirklich 09 Uhr
    // Berlin-Zeit trifft, prüft tatsächlich (außer bei manuellem force-Test).
    if (!force) {
      const berlinHour = Number(
        new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }).format(new Date()),
      );
      if (berlinHour !== 9) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "not 09:00 Europe/Berlin yet" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: openSanctions, error } = await supabaseAdmin
      .from("sanctions")
      .select("*")
      .eq("status", "offen")
      .is("reminder_sent_at", null);
    if (error) throw error;

    const now = Date.now();
    const due = (openSanctions || []).filter((s: any) => {
      const dueAt = new Date(s.due_at).getTime();
      const remaining = dueAt - now;
      // Erinnerung am 6. Tag: weniger als 24h, aber noch nicht abgelaufen.
      return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
    });

    if (due.length === 0) {
      return new Response(JSON.stringify({ success: true, reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const directionMentions = await loadDirectionMentions(supabaseAdmin);
    const directionLine = directionMentions.length
      ? directionMentions.map((id) => `<@${id}>`).join(" ")
      : "@Direction";

    const results: any[] = [];
    for (const s of due) {
      const memberMention = mentionOrName(s.target_discord_id, s.target_name);
      const dueDate = new Date(s.due_at).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

      const content = [
        `${memberMention} ${directionLine}`,
        `⏰ **Erinnerung: Offene Sanktion**`,
        `**${s.target_name}** hat die Sanktion **${s.paragraph}** über **${formatAmount(Number(s.amount))}** noch nicht bezahlt.`,
        `Fällig bis: **${dueDate}**. Bitte zeitnah begleichen bzw. bei der Direction melden.`,
      ].join("\n");

      try {
        const allowedUsers = [sanitizeDiscordId(s.target_discord_id), ...directionMentions].filter((id) => /^\d{17,20}$/.test(id));
        await sendChannelMessage(botToken, SANCTION_REASON_CHANNEL_ID, {
          content,
          allowed_mentions: { users: allowedUsers },
        });
        await supabaseAdmin.from("sanctions").update({ reminder_sent_at: new Date().toISOString() }).eq("id", s.id);
        results.push({ id: s.id, sent: true });
      } catch (e) {
        results.push({ id: s.id, sent: false, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ success: true, reminded: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await reportAutomationFailure("sanction-reminder-check", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
