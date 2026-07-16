import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

// Fixe Channel-IDs für die Sanktionsverwaltung der Air Support Division.
const SANCTION_CHANNEL_ID = "1393987948529320016"; // Sanktions-Embed
const SANCTION_REASON_CHANNEL_ID = "1399063415049424966"; // Kurze Begründung + spätere Erinnerungen

const SANCTION_COLOR = 0xe74c3c; // rot – Sanktion
const REASON_COLOR = 0xf1c40f; // gelb – Begründung

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

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatTatzeitraum(start: string, end: string) {
  const s = formatDate(start);
  const e = formatDate(end);
  return s === e ? s : `${s} bis ${e}`;
}

async function sendChannelMessage(botToken: string, channelId: string, payload: Record<string, unknown>) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord-Nachricht an Channel ${channelId} fehlgeschlagen: ${err}`);
  }
  return await res.json();
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

    const { sanction_id } = await req.json();
    if (!sanction_id) throw new Error("sanction_id fehlt");

    const { data: s, error } = await supabaseAdmin
      .from("sanctions")
      .select("*")
      .eq("id", sanction_id)
      .maybeSingle();
    if (error) throw error;
    if (!s) throw new Error("Sanktion nicht gefunden");

    const memberMention = mentionOrName(s.target_discord_id, s.target_name);
    const issuerMention = mentionOrName(s.issued_by_discord_id, s.issued_by_name);
    const tatzeitraum = formatTatzeitraum(s.tatzeitraum_start, s.tatzeitraum_end);
    const amountStr = formatAmount(Number(s.amount));

    // 1) Haupt-Sanktions-Embed
    const sanctionEmbed = {
      title: "⚠️ SANKTION",
      color: SANCTION_COLOR,
      fields: [
        { name: "MITARBEITER/IN", value: s.target_name || "-", inline: false },
        { name: "DISCORDNAME", value: memberMention, inline: false },
        { name: "GRUND", value: s.paragraph, inline: false },
        { name: "ZEUGEN", value: s.zeugen?.trim() ? s.zeugen : "-", inline: false },
        { name: "TATZEITRAUM", value: tatzeitraum, inline: false },
        { name: "SANKTION", value: amountStr, inline: false },
        { name: "AUSGEFÜHRT VON", value: issuerMention, inline: false },
        { name: "NOTIZ", value: `${s.notiz?.trim() ? s.notiz : "Keine weitere Notiz."}\n\nDiese Sanktion ist in 7 Tagen zu bezahlen oder auszuführen, andernfalls folgen weitere personalrechtliche Konsequenzen!`, inline: false },
      ],
      footer: { text: "Sanktionsverwaltung • A.S.D." },
      timestamp: new Date().toISOString(),
    };

    const sanctionMsg = await sendChannelMessage(botToken, SANCTION_CHANNEL_ID, {
      content: memberMention,
      embeds: [sanctionEmbed],
      allowed_mentions: { users: [sanitizeDiscordId(s.target_discord_id)].filter((id) => /^\d{17,20}$/.test(id)) },
    });

    // 2) Kurze Begründung in den Begründungs-Channel
    const reasonEmbed = {
      title: "📋 Sanktionsgrund",
      color: REASON_COLOR,
      fields: [
        { name: "Mitarbeiter/in", value: memberMention, inline: false },
        { name: "Grund", value: s.paragraph, inline: false },
        { name: "Bemerkung", value: s.notiz?.trim() ? s.notiz : "Keine weitere Bemerkung.", inline: false },
      ],
      footer: { text: "Sanktionsverwaltung • A.S.D." },
      timestamp: new Date().toISOString(),
    };

    const reasonMsg = await sendChannelMessage(botToken, SANCTION_REASON_CHANNEL_ID, {
      embeds: [reasonEmbed],
    });

    await supabaseAdmin
      .from("sanctions")
      .update({
        discord_message_id: sanctionMsg.id,
        discord_reason_message_id: reasonMsg.id,
      })
      .eq("id", sanction_id);

    return new Response(JSON.stringify({ success: true, message_id: sanctionMsg.id, reason_message_id: reasonMsg.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
