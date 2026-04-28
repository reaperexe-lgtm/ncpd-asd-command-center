import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

function sanitizeDiscordId(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, "") ?? "";
}

async function sendDM(botToken: string, discordId: string, message: string) {
  const channelRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!channelRes.ok) {
    const err = await channelRes.text();
    throw new Error(`Failed to create DM channel: ${err}`);
  }
  const channel = await channelRes.json();

  const msgRes = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!msgRes.ok) {
    const err = await msgRes.text();
    throw new Error(`Failed to send DM: ${err}`);
  }
  return await msgRes.json();
}

async function sendChannelMessage(
  botToken: string,
  channelId: string,
  message: string,
  mentionRoleId?: string,
) {
  const cleanChannelId = sanitizeDiscordId(channelId);
  if (!/^\d{17,20}$/.test(cleanChannelId)) {
    throw new Error(`Ungültige Discord Channel-ID: ${channelId}`);
  }

  const channelRes = await fetch(`${DISCORD_API}/channels/${cleanChannelId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!channelRes.ok) {
    const err = await channelRes.text();
    throw new Error(`Kein Zugriff auf Discord-Channel ${cleanChannelId}: ${err}`);
  }

  const cleanRoleId = sanitizeDiscordId(mentionRoleId);
  const hasRole = /^\d{17,20}$/.test(cleanRoleId);

  const body: Record<string, unknown> = { content: message };
  if (hasRole) {
    body.allowed_mentions = { parse: [], roles: [cleanRoleId] };
  }

  const msgRes = await fetch(`${DISCORD_API}/channels/${cleanChannelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!msgRes.ok) {
    const err = await msgRes.text();
    throw new Error(`Nachricht konnte nicht in Discord-Channel ${cleanChannelId} gesendet werden: ${err}`);
  }
  return await msgRes.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_BOT_TOKEN not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { type, data } = await req.json();

    if (type === "reset_request") {
      // Notify all admins with discord_id about new reset request via DM
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("discord_id, name")
          .in("id", adminIds)
          .not("discord_id", "is", null);

        const message = `📩 **Neue Reset-Anfrage**\n\n**Typ:** ${data.reset_type}\n**Grund:** ${data.reason}\n**Von:** ${data.requested_by_name}`;

        const results = [];
        for (const profile of adminProfiles || []) {
          if (profile.discord_id) {
            try {
              await sendDM(botToken, profile.discord_id, message);
              results.push({ discord_id: profile.discord_id, status: "sent" });
            } catch (e) {
              results.push({ discord_id: profile.discord_id, status: "failed", error: e.message });
            }
          }
        }
        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "No admins with Discord ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "uebung_announcement") {
      const channelId = sanitizeDiscordId(
        Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ||
        Deno.env.get("DISCORD_CHANNEL_ID")
      );
      if (!channelId) throw new Error("DISCORD_ANNOUNCEMENTS_CHANNEL_ID not set");

      const startDate = new Date(data.start_at);
      const dateStr = startDate.toLocaleString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const lines = [
        `🎯 **Neue Übung angekündigt: ${data.titel}**`,
        `━━━━━━━━━━━━━━━`,
        `📅 **Wann:** ${dateStr} Uhr`,
      ];
      if (data.ort) lines.push(`📍 **Ort:** ${data.ort}`);
      if (data.kategorie) lines.push(`🏷️ **Kategorie:** ${data.kategorie}`);
      if (data.max_teilnehmer) lines.push(`👥 **Max. Teilnehmer:** ${data.max_teilnehmer}`);
      if (data.beschreibung) lines.push(`\n${data.beschreibung}`);
      if (data.created_by_name) lines.push(`\n_Erstellt von ${data.created_by_name}_`);
      lines.push(`\n👉 Im ASD Dashboard unter **Übungen** anmelden!`);

      const mentionRoleId = sanitizeDiscordId(Deno.env.get("DISCORD_ANNOUNCEMENTS_ROLE_ID"));
      const content = mentionRoleId
        ? `<@&${mentionRoleId}>\n${lines.join("\n")}`
        : lines.join("\n");

      try {
        await sendChannelMessage(botToken, channelId, content, mentionRoleId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (type === "stats_report") {
      // Send stats report to a Discord CHANNEL (not DMs)
      const channelId = Deno.env.get("DISCORD_CHANNEL_ID");
      if (!channelId) throw new Error("DISCORD_CHANNEL_ID not set");

      const reportType = data.report_type; // "weekly" or "monthly"

      const now = new Date();
      let startDate: Date;
      let label: string;

      if (reportType === "weekly") {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - ((dayOfWeek === 0 ? 0 : dayOfWeek)));
        startDate.setHours(18, 20, 0, 0);
        if (now < startDate) {
          startDate.setDate(startDate.getDate() - 7);
        }
        label = "📊 **Wöchentliche ASD-Statistik**";
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        label = "📊 **Monatliche Statistik**";
      }

      const { data: missions } = await supabaseAdmin
        .from("missions")
        .select("protokollschreiber, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", now.toISOString());

      const counts: Record<string, number> = {};
      for (const m of missions || []) {
        if (m.protokollschreiber) {
          counts[m.protokollschreiber] = (counts[m.protokollschreiber] || 0) + 1;
        }
      }

      const userIds = Object.keys(counts);
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        for (const p of profiles || []) {
          profileMap[p.id] = p.name;
        }
      }

      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);

      let leaderboard = "";
      const medals = ["🥇", "🥈", "🥉"];
      sorted.forEach(([userId, count], idx) => {
        const name = profileMap[userId] || "Unbekannt";
        const prefix = idx < 3 ? medals[idx] : `${idx + 1}.`;
        leaderboard += `${prefix} **${name}** — ${count} Protokoll${count !== 1 ? "e" : ""}\n`;
      });

      if (!leaderboard) leaderboard = "Keine Protokolle in diesem Zeitraum.";

      const message = `${label}\n━━━━━━━━━━━━━━━\n${leaderboard}\n📅 Zeitraum: ${startDate.toLocaleDateString("de-DE")} – ${now.toLocaleDateString("de-DE")}\n📝 Gesamt: ${missions?.length || 0} Protokolle`;

      // Send to channel instead of DMs
      try {
        await sendChannelMessage(botToken, channelId, message);
        return new Response(JSON.stringify({ success: true, target: "channel", channel_id: channelId, report: message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
