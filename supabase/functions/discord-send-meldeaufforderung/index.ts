import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

// Dieselben Channel-IDs wie bei der Sanktionsverwaltung der Air Support Division.
const MELDUNG_CHANNEL_ID = "1393987948529320016"; // Meldeaufforderungs-Embed
const MELDUNG_REASON_CHANNEL_ID = "1399063415049424966"; // Notiz / Begründung

const MELDUNG_COLOR = 0xe74c3c; // rot – wie Sanktionen
const REASON_COLOR = 0xf1c40f; // gelb – Begründung

interface Contact {
  user_id: string | null;
  name: string;
  discord_id: string | null;
  internal_dienstnummer: string | null;
}

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

function formatContact(c: Contact) {
  const label = mentionOrName(c.discord_id, c.name);
  return c.internal_dienstnummer ? `[${c.internal_dienstnummer}] ${label}` : label;
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

    const { meldeaufforderung_id } = await req.json();
    if (!meldeaufforderung_id) throw new Error("meldeaufforderung_id fehlt");

    const { data: m, error } = await supabaseAdmin
      .from("meldeaufforderungen")
      .select("*")
      .eq("id", meldeaufforderung_id)
      .maybeSingle();
    if (error) throw error;
    if (!m) throw new Error("Meldeaufforderung nicht gefunden");

    const memberMention = mentionOrName(m.target_discord_id, m.target_name);
    const contacts: Contact[] = Array.isArray(m.contacts) ? m.contacts : [];
    const contactList = contacts.length > 0 ? contacts.map(formatContact).join(", ") : "der Direction";

    const meldeAllowedUserIds = [
      sanitizeDiscordId(m.target_discord_id),
      ...contacts.map((c) => sanitizeDiscordId(c.discord_id)),
    ].filter((id) => /^\d{17,20}$/.test(id));

    // 1) Haupt-Meldung
    const meldungEmbed = {
      title: "📣 MELDUNG ERFORDERLICH",
      color: MELDUNG_COLOR,
      description: `${memberMention} wird dazu aufgefordert, sich zum nächstmöglichen Zeitpunkt unverzüglich bei einem der folgenden: ${contactList} zu melden!`,
      footer: { text: "Benachrichtigungssystem vom Police Management" },
      timestamp: new Date().toISOString(),
    };

    const meldungMsg = await sendChannelMessage(botToken, MELDUNG_CHANNEL_ID, {
      content: memberMention,
      embeds: [meldungEmbed],
      allowed_mentions: { users: meldeAllowedUserIds },
    });

    // 2) Notiz / Begründung im Begründungs-Channel
    const reasonEmbed = {
      title: "📋 Meldegrund",
      color: REASON_COLOR,
      fields: [
        { name: "Mitarbeiter/in", value: memberMention, inline: false },
        { name: "Ansprechpartner", value: contactList, inline: false },
        { name: "Notiz", value: m.notiz?.trim() ? m.notiz : "Keine weitere Notiz.", inline: false },
      ],
      footer: { text: "Benachrichtigungssystem vom Police Management" },
      timestamp: new Date().toISOString(),
    };

    const reasonMsg = await sendChannelMessage(botToken, MELDUNG_REASON_CHANNEL_ID, {
      embeds: [reasonEmbed],
    });

    await supabaseAdmin
      .from("meldeaufforderungen")
      .update({
        discord_message_id: meldungMsg.id,
        discord_reason_message_id: reasonMsg.id,
      })
      .eq("id", meldeaufforderung_id);

    return new Response(JSON.stringify({ success: true, message_id: meldungMsg.id, reason_message_id: reasonMsg.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
