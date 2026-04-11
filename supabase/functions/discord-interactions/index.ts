import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

// Verify Discord interaction signature
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
            type: 3, // STRING
            required: true,
          },
        ],
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

  // PING (type 1) - Discord verification
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Slash command (type 2)
  if (interaction.type === 2 && interaction.data?.name === "stats") {
    const searchName = interaction.data.options?.find((o: any) => o.name === "name")?.value;
    if (!searchName) {
      return new Response(JSON.stringify({
        type: 4,
        data: { content: "❌ Bitte gib einen Namen an.", flags: 64 },
      }), { headers: { "Content-Type": "application/json" } });
    }

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Find the profile by name (case-insensitive partial match)
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

      // Calculate week range (Sunday 18:20 to Sunday 18:20)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek));
      startDate.setHours(18, 20, 0, 0);
      if (now < startDate) {
        startDate.setDate(startDate.getDate() - 7);
      }

      // Missions created by user
      const { data: missionsCreated } = await supabaseAdmin
        .from("missions")
        .select("id")
        .eq("created_by", profile.id)
        .gte("created_at", startDate.toISOString());

      // Missions where user was protokollschreiber
      const { data: protokolle } = await supabaseAdmin
        .from("missions")
        .select("id")
        .eq("protokollschreiber", profile.id)
        .gte("created_at", startDate.toISOString());

      // Missions where user was in crew (pilot, co_pilot, left_gunner, right_gunner)
      const { data: crewMissions } = await supabaseAdmin
        .from("missions")
        .select("id")
        .or(`pilot.eq.${profile.name},co_pilot.eq.${profile.name},left_gunner.eq.${profile.name},right_gunner.eq.${profile.name}`)
        .gte("created_at", startDate.toISOString());

      // Pursuits created by user
      const { data: pursuitsCreated } = await supabaseAdmin
        .from("pursuits")
        .select("id")
        .eq("created_by", profile.id)
        .gte("created_at", startDate.toISOString());

      // Pursuits where user was in crew
      const { data: pursuitCrew } = await supabaseAdmin
        .from("pursuits")
        .select("id")
        .or(`pilot.eq.${profile.name},co_pilot.eq.${profile.name},left_gunner.eq.${profile.name},right_gunner.eq.${profile.name},pursuer.eq.${profile.name}`)
        .gte("created_at", startDate.toISOString());

      // Flight licenses
      const { data: licenses } = await supabaseAdmin
        .from("flight_licenses")
        .select("id")
        .eq("name", profile.name);

      const statsMsg = [
        `📊 **Wochenstatistik: ${profile.name}** (${profile.dienstnummer || "–"})`,
        `━━━━━━━━━━━━━━━`,
        `📋 Einsätze erstellt: **${missionsCreated?.length || 0}**`,
        `📝 Protokolle geschrieben: **${protokolle?.length || 0}**`,
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
        data: { content: `❌ Fehler beim Abrufen der Statistik: ${error.message}`, flags: 64 },
      }), { headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ type: 1 }), {
    headers: { "Content-Type": "application/json" },
  });
});
