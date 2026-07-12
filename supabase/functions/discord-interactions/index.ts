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

// Schickt das Ergebnis nachträglich als Update der (bereits "deferred") Antwort.
// Braucht keinen Bot-Token, der Interaction-Token reicht dafür aus.
async function sendFollowup(appId: string, token: string, content: string) {
  await fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
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

// Baut den eigentlichen Inhalt für /stats, /topwoche, /topmonat, /topme.
// Läuft NACH der deferred-Antwort im Hintergrund, hat also mehr als 3 Sekunden Zeit.
async function buildCommandContent(commandName: string, interaction: any, supabaseAdmin: any): Promise<string> {
  if (commandName === "stats") {
    const searchName = interaction.data.options?.find((o: any) => o.name === "name")?.value;
    if (!searchName) return "❌ Bitte gib einen Namen an.";

    try {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, name, dienstnummer, image_url")
        .ilike("name", `%${searchName}%`)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        return `❌ Kein Mitglied mit dem Namen "${searchName}" gefunden.`;
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

      return [
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
    } catch (error: any) {
      console.error("Stats error:", error);
      return `❌ Fehler: ${error.message}`;
    }
  }

  if (commandName === "topwoche") {
    try {
      const now = new Date();
      const startDate = getAsdWeekStart(now);
      const { sorted, totalMissions, totalPursuits } = await getTopProtokollschreiber(supabaseAdmin, startDate, now);
      return buildLeaderboard(sorted, "🏆 **Top-Protokollschreiber — ASD Woche**", startDate, now, totalMissions, totalPursuits);
    } catch (error: any) {
      console.error("Topwoche error:", error);
      return `❌ Fehler: ${error.message}`;
    }
  }

  if (commandName === "topmonat") {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const { sorted, totalMissions, totalPursuits } = await getTopProtokollschreiber(supabaseAdmin, startDate, now);
      return buildLeaderboard(sorted, "🏆 **Top-Protokollschreiber — Monat**", startDate, now, totalMissions, totalPursuits);
    } catch (error: any) {
      console.error("Topmonat error:", error);
      return `❌ Fehler: ${error.message}`;
    }
  }

  if (commandName === "topme") {
    try {
      const discordUserId = interaction.member?.user?.id || interaction.user?.id;
      if (!discordUserId) return "❌ Discord-ID konnte nicht ermittelt werden.";

      const { data: linkRow } = await supabaseAdmin
        .from("profiles_private")
        .select("user_id")
        .eq("discord_id", discordUserId)
        .maybeSingle();
      const { data: profiles } = linkRow?.user_id
        ? await supabaseAdmin
            .from("profiles")
            .select("id, name, dienstnummer")
            .eq("id", linkRow.user_id)
            .limit(1)
        : { data: [] as any[] };

      if (!profiles || profiles.length === 0) {
        return "❌ Dein Discord-Account ist nicht mit einem Profil verknüpft. Bitte trage deine Discord-ID in deinem Profil auf der Webseite ein.";
      }

      const profile = profiles[0];
      const now = new Date();
      const startDate = getAsdWeekStart(now);

      const { data: protokolle } = await supabaseAdmin
        .from("missions").select("id").eq("protokollschreiber", profile.id).gte("created_at", startDate.toISOString());
      const { data: pursuitsCreated } = await supabaseAdmin
        .from("pursuits").select("id").eq("created_by", profile.id).gte("created_at", startDate.toISOString());
      const { data: crewMissions } = await supabaseAdmin
        .from("missions").select("id")
        .or(`pilot.eq.${profile.name},co_pilot.eq.${profile.name},left_gunner.eq.${profile.name},right_gunner.eq.${profile.name}`)
        .gte("created_at", startDate.toISOString());
      const { data: pursuitCrew } = await supabaseAdmin
        .from("pursuits").select("id")
        .or(`pilot.eq.${profile.name},co_pilot.eq.${profile.name},left_gunner.eq.${profile.name},right_gunner.eq.${profile.name},pursuer.eq.${profile.name}`)
        .gte("created_at", startDate.toISOString());

      const totalProtokolle = (protokolle?.length || 0) + (pursuitsCreated?.length || 0);

      return [
        `📊 **Deine Wochenstatistik — ${profile.name}** (${profile.dienstnummer || "–"})`,
        `━━━━━━━━━━━━━━━`,
        `📝 Protokolle geschrieben: **${totalProtokolle}** (📋 ${protokolle?.length || 0} Einsätze + 🚔 ${pursuitsCreated?.length || 0} 10-80)`,
        `🚁 Einsatz-Besatzung: **${crewMissions?.length || 0}**`,
        `🚔 10-80 Besatzung: **${pursuitCrew?.length || 0}**`,
        ``,
        `📅 Zeitraum: ${startDate.toLocaleDateString("de-DE")} – ${now.toLocaleDateString("de-DE")}`,
      ].join("\n");
    } catch (error: any) {
      console.error("Topme error:", error);
      return `❌ Fehler: ${error.message}`;
    }
  }

  return "❌ Unbekannter Befehl.";
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
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
          {
            name: "name",
            description: "Name der Person",
            type: 3,
            required: true,
            autocomplete: true,
          },
        ],
      },
      {
        name: "topwoche",
        description: "Zeigt die Top-Protokollschreiber der aktuellen ASD-Woche",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
      },
      {
        name: "topmonat",
        description: "Zeigt die Top-Protokollschreiber des aktuellen Monats",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
      },
      {
        name: "topme",
        description: "Zeigt deine persönliche Protokoll-Statistik der aktuellen ASD-Woche",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Autocomplete-Anfragen (während der Nutzer im /stats-Namensfeld tippt)
  if (interaction.type === 4) {
    const commandName = interaction.data?.name;

    if (commandName === "stats") {
      const focused = interaction.data.options?.find((o: any) => o.focused)?.value ?? "";

      try {
        let query = supabaseAdmin
          .from("profiles")
          .select("name, dienstnummer")
          .order("name", { ascending: true })
          .limit(25);

        if (focused) {
          query = query.ilike("name", `%${focused}%`);
        }

        const { data: profiles } = await query;

        const choices = (profiles || []).map((p: any) => ({
          name: p.dienstnummer ? `${p.name} (${p.dienstnummer})` : p.name,
          value: p.name,
        }));

        return new Response(JSON.stringify({ type: 8, data: { choices } }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Autocomplete error:", error);
        return new Response(JSON.stringify({ type: 8, data: { choices: [] } }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ type: 8, data: { choices: [] } }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Slash commands
  if (interaction.type === 2) {
    const commandName = interaction.data?.name;
    const appId = Deno.env.get("DISCORD_APPLICATION_ID")!;
    const token = interaction.token as string;

    // topme ist eine private Antwort (nur der Nutzer selbst sieht sie), der Rest ist öffentlich.
    const ephemeral = commandName === "topme";

    // Sofort "deferred" antworten (< 3 Sek.), damit Discord nie in Timeout läuft.
    // Die eigentliche Antwort wird danach im Hintergrund per Webhook nachgereicht.
    const deferredResponse = new Response(
      JSON.stringify({ type: 5, data: ephemeral ? { flags: 64 } : {} }),
      { headers: { "Content-Type": "application/json" } },
    );

    const backgroundWork = (async () => {
      const content = await buildCommandContent(commandName, interaction, supabaseAdmin);
      await sendFollowup(appId, token, content);
    })();

    // @ts-ignore - EdgeRuntime ist eine Supabase-spezifische Globalvariable zur
    // Laufzeit, damit die Function nach der Antwort im Hintergrund weiterlaufen darf.
    if (typeof EdgeRuntime !== "undefined") {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundWork);
    }

    return deferredResponse;
  }

  return new Response(JSON.stringify({ type: 1 }), {
    headers: { "Content-Type": "application/json" },
  });
});
