import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Achievements, die per SQL-Migration angelegt werden sollten, aber falls diese
// Migration auf der laufenden DB (noch) nicht ausgeführt wurde, hier per
// Service-Role idempotent nachgezogen werden (ON CONFLICT (code) DO NOTHING).
// Muss inhaltlich zu den Migrationen
//   20260712120000_add_heli_participation_achievement.sql
//   20260712130000_move_challenges_to_achievements.sql
// passen.
const REQUIRED_ACHIEVEMENT_DEFS = [
  {
    code: "crew_participations_200",
    title: "Heli-Teilnehmer",
    description: "200 Heli-Beteiligungen erreicht",
    icon: "Plane",
    tier: "diamond",
    category: "missions",
    threshold: 200,
    metric: "crew_participations_total",
    sort_order: 260,
    is_active: true,
  },
  {
    code: "pursuits_total_100_sammler",
    title: "10-80-Sammler",
    description: "100 Verfolgungen insgesamt erreicht",
    icon: "Car",
    tier: "diamond",
    category: "pursuits",
    threshold: 100,
    metric: "pursuits_total",
    sort_order: 270,
    is_active: true,
  },
  {
    code: "missions_total_100_master",
    title: "Missionen-Master",
    description: "100 Einsätze insgesamt erreicht",
    icon: "Target",
    tier: "diamond",
    category: "missions",
    threshold: 100,
    metric: "missions_total",
    sort_order: 280,
    is_active: true,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nur prüfen, dass es ein eingeloggter Nutzer ist — jeder approved Nutzer
    // darf das Nachziehen fehlender Achievement-Definitionen auslösen.
    // Die eigentliche Schreiboperation läuft mit Service-Role.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Nur einfügen, was fehlt — bestehende Definitionen (z.B. vom Admin
    // angepasste Beschreibungen/Schwellwerte) bleiben unangetastet.
    const { data: existing, error: existingError } = await admin
      .from("achievement_definitions")
      .select("code")
      .in("code", REQUIRED_ACHIEVEMENT_DEFS.map((d) => d.code));
    if (existingError) throw existingError;

    const existingCodes = new Set((existing || []).map((r: any) => r.code));
    const missing = REQUIRED_ACHIEVEMENT_DEFS.filter((d) => !existingCodes.has(d.code));

    if (missing.length) {
      const { error: insertError } = await admin
        .from("achievement_definitions")
        .upsert(missing, { onConflict: "code", ignoreDuplicates: true });
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true, inserted: missing.map((d) => d.code) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ensure-achievement-definitions error", e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
