import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

async function verifySignature(req: Request, publicKey: string): Promise<{ valid: boolean; body: string }> {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  if (!signature || !timestamp) return { valid: false, body };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    hexToUint8Array(publicKey),
    { name: "Ed25519" },
    false,
    ["verify"]
  );

  const isValid = await crypto.subtle.verify(
    "Ed25519",
    key,
    hexToUint8Array(signature),
    encoder.encode(timestamp + body)
  );

  return { valid: isValid, body };
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function getTopProtokollschreiber(supabaseAdmin: any, startDate: Date, now: Date) {
  // Missions protokollschreiber
  const { data: missions } = await supabaseAdmin
    .from("missions")
    .select("protokollschreiber")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", now.toISOString())
    .not("protokollschreiber", "is", null);

  // Pursuits (10-80) created_by counts as protocol too
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

  const sorted = Object.entries(counts)
    .map(([userId, c]) => ({ userId, name: profileMap[userId] || "Unbekannt", total: c.missions + c.pursuits, missions: c.missions, pursuits: c.pursuits }))
    .sort((a, b) => b.total - a.total);

  return { sorted, totalMissions: missions?.length || 0, totalPursuits: pursuits?.length || 0 };
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

function buildLeaderboard(sorted: any[], label: string, startDate: Date, now: Date, totalMissions: number, totalPursuits: number): string {
  const medals = ["🥇", "🥈", "🥉"];
  let leaderboard = "";

  sorted.slice(0, 15).forEach((entry, idx) => {
    const prefix = idx < 3 ? medals[idx] : `**${idx + 1}.**`;
    leaderboard += `${prefix} **${entry.name}** — ${entry.total} Protokoll${entry.total !== 1 ? "e" : ""} (📋 ${entry.missions} + 🚔 ${entry.pursuits})\n`;
  });

  if (!leaderboard) leaderboard = "Keine Protokolle in diesem Zeitraum.\n";

  return [
    label,
    `━━━━━━━━━━━━━━━`,
    leaderboard.trim(),
    ``,
    `📅 Zeitraum: ${startDate.toLocaleDateString("de-DE")} – ${now.toLocaleDateString("de-DE")}`,
    `📝 Gesamt: **${totalMissions + totalPursuits}** Protokolle (📋 ${totalMissions} Einsätze + 🚔 ${totalPursuits} 10-80)`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle slash command registration
  const url = new URL(req.url);
  if (url.searchParams.get("register") === "true") {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const appId = Deno.env.get("DISCORD_APPLICATION_ID");
    if (!botToken || !appId) {
      return new Response(JSON.stringify({ error: "Missing DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commands = [
      {
        name: "stats",
        description: "Zeigt die Wochenstatistik einer Person an",
        options: [
          {
            name: "name",
            description: "Name der Person",
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: "topwoche",
        description: "Zeigt die Top-Protokollschreiber der aktuellen ASD-Woche",
      },
      {
        name: "topmonat",
        description: "Zeigt die Top-Protokollschreiber des aktuellen Monats",
      },
      {
        name: "topme",
        description: "Zeigt deine persönliche Protokoll-Statistik der aktuellen ASD-Woche",
      },
    ];

    const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
      method: "PUT",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ success: res.ok, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle Discord interactions
  const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY");
  if (!publicKey) {
    return new Response("DISCORD_PUBLIC_KEY not set", { status: 500 });
  }

  const { valid, body } = await verifySignature(req, publicKey);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // PING
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Slash commands
  if (interaction.type === 2) {
    const commandName = interaction.data?.name;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // /stats command
    if (commandName === "stats") {
      const searchName = interaction.data.options?.find((o: any) => o.name === "name")?.value;
      if (!searchName) {
        return new Response(JSON.stringify({
          type: 4,
          data: { content: "❌ Bitte gib einen Namen an.", flags: 64 },
        }), { headers: { "Content-Type": "application/json" } });
      }

      try {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, name, dienstnummer, image_url")
          .ilike("name", `%${searchName}%`)
          .limit(1);

        if (!profiles || profiles.length === 0) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: `❌ Kein Mitglied mit dem Namen "${searchName}" gefunden.`, flags: 64 },
          }), { headers: { "Content-Type": "application/json" } });
        }

        const profile = profiles[0];
        const now = new Date();
        const startDate = getAsdWeekStart(now);

        const { data: missionsCreated } = await supabaseAdmin
          .from("missions").select("id").eq("created_by", profile.id).gte("created_at", startDate.toISOString());
        const { data: protokolle } = await supabaseAdmin
          .from("missions").select("id").eq("protokollschreiber", profile.id).gte("created_at", startDate.toISOString());
        const { data: crewMissions } = await supabaseAdmin
          .from("missions").select("id")
          .or(`pilot.eq.${profile.name},co_pilot.eq.${profile.name},left_gunner.eq.${profile.name},right_gunner.eq.${profile.name}`)
          .gte("created_at", startDate.toISOString());
        const { data: pursuitsCreated } = await supabaseAdmin
          .from("pursuits").select("id").eq("created_by", profile.id).gte("created_at", startDate.toISOString());
        const { data: pursuitCrew } = await supabaseAdmin
          .from("pursuits").select("id")
          .or(`pilot.eq.${profile.name},co_pilot.eq.${profile.name},left_gunner.eq.${profile.name},right_gunner.eq.${profile.name},pursuer.eq.${profile.name}`)
          .gte("created_at", startDate.toISOString());
        const { data: licenses } = await supabaseAdmin
          .from("flight_licenses").select("id").eq("name", profile.name);

        const totalProtokolle = (protokolle?.length || 0) + (pursuitsCreated?.length || 0);

        const statsMsg = [
          `📊 **Wochenstatistik: ${profile.name}** (${profile.dienstnummer || "–"})`,
          `━━━━━━━━━━━━━━━`,
          `📋 Einsätze erstellt: **${missionsCreated?.length || 0}**`,
          `📝 Protokolle geschrieben: **${totalProtokolle}** (${protokolle?.length || 0} Einsätze + ${pursuitsCreated?.length || 0} 10-80)`,
          `🚁 Einsatz-Besatzung: **${crewMissions?.length || 0}**`,
          `🚔 10-80 erstellt: **${pursuitsCreated?.length || 0}**`,
          `🚔 10-80 Besatzung: **${pursuitCrew?.length || 0}**`,
          `✈️ Fluglizenzen: **${licenses?.length || 0}**`,
          ``,
          `📅 Zeitraum: ${startDate.toLocaleDateString("de-DE")} – ${now.toLocaleDateString("de-DE")}`,
        ].join("\n");

        return new Response(JSON.stringify({
          type: 4,
          data: { content: statsMsg },
        }), { headers: { "Content-Type": "application/json" } });

      } catch (error) {
        console.error("Stats error:", error);
        return new Response(JSON.stringify({
          type: 4,
          data: { content: `❌ Fehler: ${error.message}`, flags: 64 },
        }), { headers: { "Content-Type": "application/json" } });
      }
    }

    // /topwoche command
    if (commandName === "topwoche") {
      try {
        const now = new Date();
        const startDate = getAsdWeekStart(now);
        const { sorted, totalMissions, totalPursuits } = await getTopProtokollschreiber(supabaseAdmin, startDate, now);
        const message = buildLeaderboard(sorted, "🏆 **Top-Protokollschreiber — ASD Woche**", startDate, now, totalMissions, totalPursuits);

        return new Response(JSON.stringify({
          type: 4,
          data: { content: message },
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error) {
        console.error("Topwoche error:", error);
        return new Response(JSON.stringify({
          type: 4,
          data: { content: `❌ Fehler: ${error.message}`, flags: 64 },
        }), { headers: { "Content-Type": "application/json" } });
      }
    }

    // /topmonat command
    if (commandName === "topmonat") {
      try {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const { sorted, totalMissions, totalPursuits } = await getTopProtokollschreiber(supabaseAdmin, startDate, now);
        const message = buildLeaderboard(sorted, "🏆 **Top-Protokollschreiber — Monat**", startDate, now, totalMissions, totalPursuits);

        return new Response(JSON.stringify({
          type: 4,
          data: { content: message },
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error) {
        console.error("Topmonat error:", error);
        return new Response(JSON.stringify({
          type: 4,
          data: { content: `❌ Fehler: ${error.message}`, flags: 64 },
        }), { headers: { "Content-Type": "application/json" } });
      }
    }
  }

  return new Response(JSON.stringify({ type: 1 }), {
    headers: { "Content-Type": "application/json" },
  });
});
