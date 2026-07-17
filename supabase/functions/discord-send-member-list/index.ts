import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { reportAutomationFailure } from "../_shared/automation-alert.ts";

const DISCORD_API = "https://discord.com/api/v10";

// Gleiche Rollen-Reihenfolge/-Labels wie in src/pages/MemberPage.tsx, damit
// die Discord-Liste konsistent mit der Mitglieder-Ansicht im Panel ist.
const ROLE_ORDER = ["director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member"];
const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  co_director: "Co-Director",
  supervisor: "Supervisor",
  ausbilder: "Ausbilder",
  trial_ausbilder: "Trial-Ausbilder",
  member: "Member",
  trial_member: "Trial Member",
};

const DEFAULT_CHANNEL_ID = "1354479009714405568";

function chunkLines(lines: string[], maxLen = 1000): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > maxLen) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch (_e) { /* leerer Body ist ok */ }

    // Settings laden (Channel + evtl. vorhandene Message-ID zum Editieren)
    const { data: settingsRows } = await supabaseAdmin
      .from("permission_settings")
      .select("permission_key, role")
      .in("permission_key", ["member_list_channel_id", "member_list_message_id"]);
    const settings: Record<string, string> = {};
    for (const r of settingsRows || []) settings[r.permission_key] = r.role ?? "";

    const channelId: string = (body?.channel_id?.trim()) || settings.member_list_channel_id?.trim() || DEFAULT_CHANNEL_ID;

    // Mitglieder + Rollen laden
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("id, name, dienstnummer, is_approved, is_blocked")
      .eq("is_approved", true)
      .eq("is_blocked", false);
    if (profilesErr) throw profilesErr;

    const { data: roleRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw rolesErr;

    const rolesByUser: Record<string, string[]> = {};
    for (const r of roleRows || []) {
      (rolesByUser[r.user_id] ||= []).push(r.role);
    }

    // Gruppieren: pro Nutzer die höchste sichtbare Rolle nach ROLE_ORDER
    const grouped: Record<string, { name: string; dienstnummer: string }[]> = {};
    for (const p of profiles || []) {
      const userRoles = rolesByUser[p.id] || [];
      const displayRole = ROLE_ORDER.find((r) => userRoles.includes(r));
      if (!displayRole) continue; // z.B. reine admin/applicant-Accounts ausblenden
      (grouped[displayRole] ||= []).push({
        name: p.name || "Unbenannt",
        dienstnummer: p.dienstnummer || "–",
      });
    }
    for (const role of Object.keys(grouped)) {
      grouped[role].sort((a, b) => a.name.localeCompare(b.name, "de"));
    }

    const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

    const fields: { name: string; value: string; inline: boolean }[] = [];
    for (const role of ROLE_ORDER) {
      const members = grouped[role];
      if (!members?.length) continue;
      const lines = members.map((m) => `**${m.name}** — ${m.dienstnummer}`);
      const chunks = chunkLines(lines);
      chunks.forEach((chunk, i) => {
        fields.push({
          name: chunks.length > 1
            ? `${ROLE_LABELS[role]} (${members.length}) — Teil ${i + 1}`
            : `${ROLE_LABELS[role]} (${members.length})`,
          value: chunk,
          inline: false,
        });
      });
    }

    const embed = {
      title: "📋 A.S.D. Mitgliederliste",
      description: `Narco City Police Department — Air Support Division\nGesamt: **${totalCount}** Mitglieder`,
      color: 3097651,
      fields,
      footer: { text: `Stand: ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} Uhr` },
    };

    const payload = { embeds: [embed] };
    const existingMessageId = settings.member_list_message_id?.trim();

    let messageId: string | null = null;

    if (existingMessageId) {
      const editRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${existingMessageId}`, {
        method: "PATCH",
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (editRes.ok) {
        messageId = existingMessageId;
      }
      // Falls die Nachricht z.B. gelöscht wurde (404), fällt der Code unten
      // durch und postet stattdessen eine neue Nachricht.
    }

    if (!messageId) {
      const postRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`Discord API Fehler (${postRes.status}): ${errText}`);
      }
      const posted = await postRes.json();
      messageId = posted.id;
    }

    // Channel + Message-ID für zukünftige Aufrufe (Edit-in-place) speichern.
    await supabaseAdmin.from("permission_settings").upsert(
      [
        { permission_key: "member_list_channel_id", role: channelId },
        { permission_key: "member_list_message_id", role: messageId },
      ],
      { onConflict: "permission_key" },
    );

    return new Response(JSON.stringify({ success: true, channel_id: channelId, message_id: messageId, total: totalCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    await reportAutomationFailure("discord-send-member-list", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
