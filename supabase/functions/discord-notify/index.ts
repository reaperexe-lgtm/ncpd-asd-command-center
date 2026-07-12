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
  extraRoleIds: string[] = [],
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

  const allowedRoles: string[] = [];
  if (hasRole) allowedRoles.push(cleanRoleId);
  for (const r of extraRoleIds) {
    const c = sanitizeDiscordId(r);
    if (/^\d{17,20}$/.test(c) && !allowedRoles.includes(c)) allowedRoles.push(c);
  }

  const body: Record<string, unknown> = { content: message };
  if (allowedRoles.length > 0) {
    body.allowed_mentions = { parse: [], roles: allowedRoles };
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

    if (type === "cleanup_test_messages") {
      // Search across both configured channels (announcements + general)
      const candidateChannelIds = [
        sanitizeDiscordId(Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID")),
        sanitizeDiscordId(Deno.env.get("DISCORD_CHANNEL_ID")),
      ].filter((id, i, arr) => id && arr.indexOf(id) === i);
      if (candidateChannelIds.length === 0) throw new Error("Kein Discord-Channel konfiguriert");

      // Get bot's own user id
      const meRes = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      const me = await meRes.json();

      const needle = (data?.contains as string) ?? "Bot-Test";
      // If the bot lacks Message Content Intent, m.content will be empty for messages
      // it didn't author. So we additionally allow deletion based on author id alone
      // when the caller passes match_own_bot_only or matchByAuthor.
      const matchByAuthor = data?.match_by_author === true;

      const allDeleted: string[] = [];
      const debug: any = data?.debug ? { bot_user_id: me.id, channels: [] } : undefined;

      for (const channelId of candidateChannelIds) {
        const msgsRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages?limit=50`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (!msgsRes.ok) {
          if (debug) debug.channels.push({ channel_id: channelId, error: await msgsRes.text() });
          continue;
        }
        const messages = await msgsRes.json();

        const toDelete = messages.filter((m: any) => {
          const isOwnBot = m.author?.id === me.id;
          if (matchByAuthor) return isOwnBot;
          const contentMatch = typeof m.content === "string" && m.content.includes(needle);
          return contentMatch && (isOwnBot || m.author?.bot === true || m.webhook_id);
        });

        for (const m of toDelete) {
          const delRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${m.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bot ${botToken}` },
          });
          if (delRes.ok) allDeleted.push(m.id);
        }

        if (debug) {
          debug.channels.push({
            channel_id: channelId,
            total_messages: messages.length,
            own_bot_messages: messages.filter((m: any) => m.author?.id === me.id).length,
            deleted_here: toDelete.length,
            sample: messages.slice(0, 8).map((m: any) => ({
              id: m.id,
              author_id: m.author?.id,
              author_username: m.author?.username,
              is_bot: m.author?.bot,
              webhook_id: m.webhook_id,
              content_preview: typeof m.content === "string" ? m.content.slice(0, 80) : null,
            })),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, deleted_count: allDeleted.length, deleted: allDeleted, debug }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "test_channel_message") {
      const channelId = sanitizeDiscordId(
        Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ||
        Deno.env.get("DISCORD_CHANNEL_ID")
      );
      if (!channelId) throw new Error("Kein Discord-Channel konfiguriert");
      const triggeredBy: string = (data?.triggered_by as string) || "Admin";
      const time = new Date().toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
      });
      const content = `✅ **Bot-Test** — Testnachricht aus dem ASD Dashboard\nAusgelöst von **${triggeredBy}** um ${time} Uhr.`;
      const msg = await sendChannelMessage(botToken, channelId, content);
      return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "reset_request") {
      // Notify all admins with discord_id about new reset request via DM
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const [{ data: adminProfilesRaw }, { data: adminPrivate }] = await Promise.all([
          supabaseAdmin.from("profiles").select("id, name").in("id", adminIds),
          supabaseAdmin.from("profiles_private").select("user_id, discord_id").in("user_id", adminIds).not("discord_id", "is", null),
        ]);
        const nameMap: Record<string, string> = {};
        for (const p of adminProfilesRaw || []) nameMap[(p as any).id] = (p as any).name;
        const adminProfiles = (adminPrivate || []).map((r: any) => ({
          discord_id: r.discord_id,
          name: nameMap[r.user_id] ?? "Admin",
        }));

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
      // Fixed channel for Übungen announcements
      const channelId = "1374418517968945243";

      const startDate = new Date(data.start_at);
      const dateStr = startDate.toLocaleString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
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
      const uebungUrl = data.id
        ? `https://asd-ncpd.lovable.app/uebungen#${data.id}`
        : `https://asd-ncpd.lovable.app/uebungen`;
      lines.push(`\n🔗 **Übung im ASD Dashboard:** ${uebungUrl}`);
      lines.push(`\n⚠️ **REAKTIONSPFLICHT!** ⚠️`);
      lines.push(`Jedes ASD-Mitglied ist **verpflichtet**, auf jede Übung mit Zu- oder Absage zu reagieren.`);
      lines.push(`\n_Zu- und Absagen bitte direkt im Dashboard eintragen._`);

      const mentionRoleId = sanitizeDiscordId(Deno.env.get("DISCORD_ANNOUNCEMENTS_ROLE_ID"));
      const content = mentionRoleId
        ? `<@&${mentionRoleId}>\n${lines.join("\n")}`
        : lines.join("\n");

      try {
        // Edit existing announcement(s) for this Übung instead of posting new
        if (data.edit_existing && data.id) {
          const recentRes = await fetch(
            `${DISCORD_API}/channels/${channelId}/messages?limit=100`,
            { headers: { Authorization: `Bot ${botToken}` } },
          );
          if (!recentRes.ok) throw new Error(`fetch messages failed: ${await recentRes.text()}`);
          const msgs = await recentRes.json();
          let edited = 0;
          for (const m of msgs) {
            if (m.author?.bot && typeof m.content === "string" && m.content.includes(data.id)) {
              const patchRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${m.id}`, {
                method: "PATCH",
                headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
              });
              if (patchRes.ok) edited++;
            }
          }
          return new Response(JSON.stringify({ success: true, edited }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Optionally delete prior bot announcement(s) for this Übung
        if (data.delete_previous && data.id) {
          try {
            const recentRes = await fetch(
              `${DISCORD_API}/channels/${channelId}/messages?limit=50`,
              { headers: { Authorization: `Bot ${botToken}` } },
            );
            if (recentRes.ok) {
              const msgs = await recentRes.json();
              for (const m of msgs) {
                if (m.author?.bot && typeof m.content === "string" && m.content.includes(data.id)) {
                  await fetch(`${DISCORD_API}/channels/${channelId}/messages/${m.id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bot ${botToken}` },
                  });
                }
              }
            }
          } catch (_e) { /* ignore */ }
        }
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

    if (type === "aufstellung_announcement") {
      const channelId = sanitizeDiscordId(
        Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ||
        Deno.env.get("DISCORD_CHANNEL_ID")
      );
      if (!channelId) throw new Error("DISCORD_ANNOUNCEMENTS_CHANNEL_ID not set");

      // Load configured datetime + location from settings if not provided
      let startAt: string | undefined = data?.start_at;
      let ort: string = data?.ort ?? "Vespucci Police Department Dach";

      if (!startAt) {
        const { data: rows } = await supabaseAdmin
          .from("permission_settings")
          .select("permission_key, role")
          .in("permission_key", ["aufstellung_next_at", "aufstellung_ort"]);
        for (const r of rows || []) {
          if (r.permission_key === "aufstellung_next_at" && r.role) startAt = r.role;
          if (r.permission_key === "aufstellung_ort" && r.role) ort = r.role;
        }
      }
      if (!startAt) throw new Error("Kein Aufstellungs-Datum konfiguriert");

      const startDate = new Date(startAt);
      const dateStr = startDate.toLocaleString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });

      const mentionRoleId = sanitizeDiscordId(Deno.env.get("DISCORD_ANNOUNCEMENTS_ROLE_ID"));
      const memberMention = mentionRoleId ? `<@&${mentionRoleId}>` : "@A.S.D";
      const ASD_LEITUNG_ROLE_ID = "1354392542178840686";
      const leitungMention = `<@&${ASD_LEITUNG_ROLE_ID}>`;

      const content = [
        `# Wöchentliche Aufstellung`,
        ``,
        `Sehr geehrte ${memberMention},`,
        `am **${dateStr} Uhr** findet unsere wöchentliche Aufstellung auf dem **${ort}** statt!`,
        ``,
        `Wir freuen uns darauf, möglichst viele von euch sehen zu dürfen!`,
        ``,
        `Mit freundlichen Grüßen,`,
        `${leitungMention}`,
      ].join("\n");

      try {
        const msg = await sendChannelMessage(botToken, channelId, content, mentionRoleId, [ASD_LEITUNG_ROLE_ID]);
        const reactionResults: { emoji: string; status: number; body?: string }[] = [];
        for (const emoji of ["✅", "❌"]) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const res = await fetch(
              `${DISCORD_API}/channels/${channelId}/messages/${msg.id}/reactions/${encodeURIComponent(emoji)}/@me`,
              { method: "PUT", headers: { Authorization: `Bot ${botToken}` } },
            );
            if (res.status === 429) {
              const retry = await res.json().catch(() => ({ retry_after: 1 }));
              await new Promise((r) => setTimeout(r, Math.ceil((retry.retry_after ?? 1) * 1000)));
              continue;
            }
            reactionResults.push({
              emoji,
              status: res.status,
              body: res.ok ? undefined : await res.text(),
            });
            break;
          }
          await new Promise((r) => setTimeout(r, 350));
        }
        return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (type === "aufstellung_reminder") {
      const channelId = sanitizeDiscordId(
        Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ||
        Deno.env.get("DISCORD_CHANNEL_ID")
      );
      if (!channelId) throw new Error("DISCORD_ANNOUNCEMENTS_CHANNEL_ID not set");

      let startAt: string | undefined = data?.start_at;
      let ort: string = data?.ort ?? "Vespucci Police Department Dach";

      if (!startAt) {
        const { data: rows } = await supabaseAdmin
          .from("permission_settings")
          .select("permission_key, role")
          .in("permission_key", ["aufstellung_next_at", "aufstellung_ort"]);
        for (const r of rows || []) {
          if (r.permission_key === "aufstellung_next_at" && r.role) startAt = r.role;
          if (r.permission_key === "aufstellung_ort" && r.role) ort = r.role;
        }
      }

      const timeStr = startAt
        ? new Date(startAt).toLocaleString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          }) + " Uhr"
        : "18:00 Uhr";

      const mentionRoleId = sanitizeDiscordId(Deno.env.get("DISCORD_ANNOUNCEMENTS_ROLE_ID"));
      const memberMention = mentionRoleId ? `<@&${mentionRoleId}>` : "@A.S.D";
      const ASD_LEITUNG_ROLE_ID = "1354392542178840686";
      const leitungMention = `<@&${ASD_LEITUNG_ROLE_ID}>`;

      const content = [
        `# ⏰ Erinnerung: Aufstellung in 2 Stunden`,
        ``,
        `Sehr geehrte ${memberMention},`,
        `dies ist eine freundliche Erinnerung, dass unsere wöchentliche Aufstellung **heute um ${timeStr}** auf dem **${ort}** stattfindet.`,
        ``,
        `Bitte erscheint pünktlich und in vollständiger Dienstkleidung.`,
        ``,
        `Mit freundlichen Grüßen,`,
        `${leitungMention}`,
      ].join("\n");

      try {
        const msg = await sendChannelMessage(botToken, channelId, content, mentionRoleId, [ASD_LEITUNG_ROLE_ID]);
        return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (type === "achievement_unlocked") {
      const tierEmoji: Record<string, string> = {
        bronze: "🥉",
        silver: "🥈",
        gold: "🥇",
        platinum: "💎",
      };
      const emoji = tierEmoji[data.achievement_tier] || "🏆";

      // 1) DM to the user (if discord_id set)
      let dmStatus: any = { sent: false };
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles_private")
          .select("discord_id")
          .eq("user_id", data.user_id)
          .maybeSingle();

        if (profile?.discord_id) {
          const dmMessage = [
            `${emoji} **Glückwunsch! Neues Achievement freigeschaltet:**`,
            `**${data.achievement_title}**`,
            data.achievement_description ? `_${data.achievement_description}_` : "",
            ``,
            `💰 **Belohnung: 50.000$**`,
            `Bitte melde dich bei der **ASD Direction**, um deine Belohnung zu erhalten.`,
          ].filter(Boolean).join("\n");
          try {
            await sendDM(botToken, profile.discord_id, dmMessage);
            dmStatus = { sent: true, discord_id: profile.discord_id };
          } catch (e) {
            dmStatus = { sent: false, error: (e as Error).message };
          }
        }
      } catch (e) {
        dmStatus = { sent: false, error: (e as Error).message };
      }

      // 2) Direct Messages to all Direction members (director, co_director)
      const directionResults: any[] = [];
      try {
        const { data: directionRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("role", ["director", "co_director"]);

        const directionIds = (directionRoles || []).map((r: any) => r.user_id);
        if (directionIds.length > 0) {
          const [{ data: directionNames }, { data: directionPrivate }] = await Promise.all([
            supabaseAdmin.from("profiles").select("id, name").in("id", directionIds),
            supabaseAdmin.from("profiles_private").select("user_id, discord_id").in("user_id", directionIds).not("discord_id", "is", null),
          ]);
          const dirNameMap: Record<string, string> = {};
          for (const p of directionNames || []) dirNameMap[(p as any).id] = (p as any).name;
          const directionProfiles = (directionPrivate || []).map((r: any) => ({
            discord_id: r.discord_id,
            name: dirNameMap[r.user_id] ?? "Direction",
          }));

          const dn = data.dienstnummer ? ` (#${data.dienstnummer})` : "";
          const directionMessage = [
            `${emoji} **Achievement-Auszahlung erforderlich**`,
            `🎖️ **${data.user_name}${dn}** hat ein neues Achievement freigeschaltet:`,
            `🏆 **${data.achievement_title}**`,
            data.achievement_description ? `_${data.achievement_description}_` : "",
            ``,
            `💰 **Belohnung: 50.000$**`,
            `Bitte zahle dem Mitglied die **50.000$** aus, sobald es sich bei dir meldet.`,
          ].filter(Boolean).join("\n");

          for (const profile of directionProfiles || []) {
            if (!profile.discord_id) continue;
            try {
              await sendDM(botToken, profile.discord_id, directionMessage);
              directionResults.push({ name: profile.name, discord_id: profile.discord_id, sent: true });
            } catch (e) {
              directionResults.push({ name: profile.name, discord_id: profile.discord_id, sent: false, error: (e as Error).message });
            }
          }
        }
      } catch (e) {
        directionResults.push({ sent: false, error: (e as Error).message });
      }

      return new Response(JSON.stringify({ success: true, dm: dmStatus, direction_dms: directionResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "challenge_completed") {
      const rewardStr = `${Number(data.reward_amount || 0).toLocaleString("de-DE")}$`;

      // 1) DM to the user (if discord_id set)
      let dmStatus: any = { sent: false };
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles_private")
          .select("discord_id")
          .eq("user_id", data.user_id)
          .maybeSingle();

        if (profile?.discord_id) {
          const dmMessage = [
            `🏆 **Challenge geschafft: ${data.challenge_title}**`,
            data.challenge_description ? `_${data.challenge_description}_` : "",
            ``,
            `💰 **Belohnung: ${rewardStr} Ingame-Geld**`,
            `Die **ASD Direction** wurde benachrichtigt. Bitte melde dich dort, um deine Belohnung zu erhalten.`,
          ].filter(Boolean).join("\n");
          try {
            await sendDM(botToken, profile.discord_id, dmMessage);
            dmStatus = { sent: true, discord_id: profile.discord_id };
          } catch (e) {
            dmStatus = { sent: false, error: (e as Error).message };
          }
        }
      } catch (e) {
        dmStatus = { sent: false, error: (e as Error).message };
      }

      // 2) Direct Messages to all Direction members (director, co_director)
      const directionResults: any[] = [];
      try {
        const { data: directionRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("role", ["director", "co_director"]);

        const directionIds = (directionRoles || []).map((r: any) => r.user_id);
        if (directionIds.length > 0) {
          const [{ data: directionNames }, { data: directionPrivate }] = await Promise.all([
            supabaseAdmin.from("profiles").select("id, name").in("id", directionIds),
            supabaseAdmin.from("profiles_private").select("user_id, discord_id").in("user_id", directionIds).not("discord_id", "is", null),
          ]);
          const dirNameMap: Record<string, string> = {};
          for (const p of directionNames || []) dirNameMap[(p as any).id] = (p as any).name;
          const directionProfiles = (directionPrivate || []).map((r: any) => ({
            discord_id: r.discord_id,
            name: dirNameMap[r.user_id] ?? "Direction",
          }));

          const dn = data.dienstnummer ? ` (#${data.dienstnummer})` : "";
          const directionMessage = [
            `🏆 **Challenge-Auszahlung erforderlich**`,
            `🎖️ **${data.user_name}${dn}** hat die Wochen-Challenge geschafft:`,
            `📌 **${data.challenge_title}**`,
            data.challenge_description ? `_${data.challenge_description}_` : "",
            ``,
            `💰 **Belohnung: ${rewardStr} Ingame-Geld**`,
            `Bitte zahle dem Mitglied die **${rewardStr}** aus, sobald es sich bei dir meldet.`,
          ].filter(Boolean).join("\n");

          for (const profile of directionProfiles || []) {
            if (!profile.discord_id) continue;
            try {
              await sendDM(botToken, profile.discord_id, directionMessage);
              directionResults.push({ name: profile.name, discord_id: profile.discord_id, sent: true });
            } catch (e) {
              directionResults.push({ name: profile.name, discord_id: profile.discord_id, sent: false, error: (e as Error).message });
            }
          }
        }
      } catch (e) {
        directionResults.push({ sent: false, error: (e as Error).message });
      }

      return new Response(JSON.stringify({ success: true, dm: dmStatus, direction_dms: directionResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

      const message = `${pingPrefix}${label}\n━━━━━━━━━━━━━━━\n${leaderboard}\n📅 Zeitraum: ${startDate.toLocaleDateString("de-DE")} – ${now.toLocaleDateString("de-DE")}\n📝 Gesamt: ${missions?.length || 0} Protokolle`;

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
