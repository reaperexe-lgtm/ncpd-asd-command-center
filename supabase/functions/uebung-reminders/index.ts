import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

function sanitizeDiscordId(raw?: string | null): string {
  if (!raw) return "";
  return String(raw).replace(/[^0-9]/g, "");
}

async function sendDM(botToken: string, discordId: string, message: string) {
  const clean = sanitizeDiscordId(discordId);
  if (!/^\d{17,20}$/.test(clean)) throw new Error(`Invalid Discord ID: ${discordId}`);
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: clean }),
  });
  if (!dmRes.ok) throw new Error(`DM channel failed: ${await dmRes.text()}`);
  const channel = await dmRes.json();
  const msgRes = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!msgRes.ok) throw new Error(`DM send failed: ${await msgRes.text()}`);
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

    const now = new Date();
    const in23h = new Date(now.getTime() + 23 * 3600 * 1000).toISOString();
    const in25h = new Date(now.getTime() + 25 * 3600 * 1000).toISOString();

    // Find Übungen starting 23-25h from now, where reminder hasn't been sent
    const { data: uebungen, error } = await supabase
      .from("uebungen")
      .select("id, titel, start_at, ort, kategorie, reminder_sent_at")
      .is("reminder_sent_at", null)
      .gte("start_at", in23h)
      .lte("start_at", in25h);

    if (error) throw error;

    const summary: any[] = [];

    for (const u of uebungen || []) {
      // Mark immediately to prevent duplicate sends if function re-runs
      const { error: updErr } = await supabase
        .from("uebungen")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", u.id)
        .is("reminder_sent_at", null);
      if (updErr) {
        summary.push({ uebung_id: u.id, error: updErr.message });
        continue;
      }

      // Get all approved members with discord_id
      const { data: members } = await supabase
        .from("profiles")
        .select("id, name, discord_id")
        .eq("is_approved", true)
        .not("discord_id", "is", null);

      // Get members who already responded
      const { data: tns } = await supabase
        .from("uebung_teilnahmen")
        .select("user_id")
        .eq("uebung_id", u.id);
      const respondedIds = new Set((tns || []).map((t) => t.user_id));

      const targets = (members || []).filter(
        (m) => !respondedIds.has(m.id) && m.discord_id,
      );

      const startDate = new Date(u.start_at);
      const dateStr = startDate.toLocaleString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
      const url = `https://asd-ncpd.lovable.app/uebungen#${u.id}`;
      const message =
        `⏰ **Erinnerung: Übung in 24h**\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🎯 **${u.titel}**\n` +
        `📅 ${dateStr} Uhr\n` +
        (u.ort ? `📍 ${u.ort}\n` : "") +
        `\nDu hast noch nicht geantwortet.\n` +
        `Bitte trage Zu- oder Absage im Dashboard ein:\n${url}`;

      let sent = 0;
      let failed = 0;
      for (const m of targets) {
        try {
          await sendDM(botToken, m.discord_id!, message);
          sent++;
        } catch (_e) {
          failed++;
        }
      }
      summary.push({ uebung_id: u.id, titel: u.titel, sent, failed, targets: targets.length });
    }

    return new Response(JSON.stringify({ success: true, processed: summary.length, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});