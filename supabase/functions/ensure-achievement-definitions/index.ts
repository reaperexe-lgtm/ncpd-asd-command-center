import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Achievements, die per SQL-Migration angelegt werden sollten, aber falls diese
// Migration auf der laufenden DB (noch) nicht ausgeführt wurde, hier per
// Service-Role idempotent nachgezogen werden (ON CONFLICT (code) DO NOTHING).
// Muss inhaltlich zur Migration
//   20260712140000_revert_heli_teilnahme_and_tier_sammler_master.sql
// passen. Heli-Teilnehmer (crew_participations_200) wurde entfernt; 10-80-Sammler
// und Missionen-Master sind jetzt 8-stufige Familien mit eigener reward_amount.
const REQUIRED_ACHIEVEMENT_DEFS = [
  { code: "pursuits_sammler_10", title: "10-80-Lehrling", description: "10 Verfolgungen insgesamt erreicht", icon: "Car", tier: "bronze", category: "pursuits", threshold: 10, metric: "pursuits_total", sort_order: 271, is_active: true, base_code: "pursuits_sammler", tier_level: 1, reward_amount: 100000 },
  { code: "pursuits_sammler_50", title: "10-80-Geselle", description: "50 Verfolgungen insgesamt erreicht", icon: "Car", tier: "silver", category: "pursuits", threshold: 50, metric: "pursuits_total", sort_order: 272, is_active: true, base_code: "pursuits_sammler", tier_level: 2, reward_amount: 250000 },
  { code: "pursuits_sammler_150", title: "10-80-Experte", description: "150 Verfolgungen insgesamt erreicht", icon: "Car", tier: "gold", category: "pursuits", threshold: 150, metric: "pursuits_total", sort_order: 273, is_active: true, base_code: "pursuits_sammler", tier_level: 3, reward_amount: 500000 },
  { code: "pursuits_sammler_200", title: "10-80-Spezialist", description: "200 Verfolgungen insgesamt erreicht", icon: "Car", tier: "platinum", category: "pursuits", threshold: 200, metric: "pursuits_total", sort_order: 274, is_active: true, base_code: "pursuits_sammler", tier_level: 4, reward_amount: 750000 },
  { code: "pursuits_sammler_300", title: "10-80-Champion", description: "300 Verfolgungen insgesamt erreicht", icon: "Car", tier: "diamond", category: "pursuits", threshold: 300, metric: "pursuits_total", sort_order: 275, is_active: true, base_code: "pursuits_sammler", tier_level: 5, reward_amount: 1000000 },
  { code: "pursuits_sammler_400", title: "10-80-Elite", description: "400 Verfolgungen insgesamt erreicht", icon: "Car", tier: "emerald", category: "pursuits", threshold: 400, metric: "pursuits_total", sort_order: 276, is_active: true, base_code: "pursuits_sammler", tier_level: 6, reward_amount: 1250000 },
  { code: "pursuits_sammler_500", title: "10-80-Meister", description: "500 Verfolgungen insgesamt erreicht", icon: "Car", tier: "ruby", category: "pursuits", threshold: 500, metric: "pursuits_total", sort_order: 277, is_active: true, base_code: "pursuits_sammler", tier_level: 7, reward_amount: 1500000 },
  { code: "pursuits_sammler_1000", title: "10-80-Sammler", description: "1000 Verfolgungen insgesamt erreicht", icon: "Car", tier: "obsidian", category: "pursuits", threshold: 1000, metric: "pursuits_total", sort_order: 278, is_active: true, base_code: "pursuits_sammler", tier_level: 8, reward_amount: 2650000 },

  { code: "missions_master_10", title: "Missionen-Lehrling", description: "10 Einsätze insgesamt erreicht", icon: "Target", tier: "bronze", category: "missions", threshold: 10, metric: "missions_total", sort_order: 281, is_active: true, base_code: "missions_master", tier_level: 1, reward_amount: 100000 },
  { code: "missions_master_50", title: "Missionen-Geselle", description: "50 Einsätze insgesamt erreicht", icon: "Target", tier: "silver", category: "missions", threshold: 50, metric: "missions_total", sort_order: 282, is_active: true, base_code: "missions_master", tier_level: 2, reward_amount: 250000 },
  { code: "missions_master_150", title: "Missionen-Experte", description: "150 Einsätze insgesamt erreicht", icon: "Target", tier: "gold", category: "missions", threshold: 150, metric: "missions_total", sort_order: 283, is_active: true, base_code: "missions_master", tier_level: 3, reward_amount: 500000 },
  { code: "missions_master_200", title: "Missionen-Spezialist", description: "200 Einsätze insgesamt erreicht", icon: "Target", tier: "platinum", category: "missions", threshold: 200, metric: "missions_total", sort_order: 284, is_active: true, base_code: "missions_master", tier_level: 4, reward_amount: 750000 },
  { code: "missions_master_300", title: "Missionen-Champion", description: "300 Einsätze insgesamt erreicht", icon: "Target", tier: "diamond", category: "missions", threshold: 300, metric: "missions_total", sort_order: 285, is_active: true, base_code: "missions_master", tier_level: 5, reward_amount: 1000000 },
  { code: "missions_master_400", title: "Missionen-Elite", description: "400 Einsätze insgesamt erreicht", icon: "Target", tier: "emerald", category: "missions", threshold: 400, metric: "missions_total", sort_order: 286, is_active: true, base_code: "missions_master", tier_level: 6, reward_amount: 1250000 },
  { code: "missions_master_500", title: "Missionen-Meister", description: "500 Einsätze insgesamt erreicht", icon: "Target", tier: "ruby", category: "missions", threshold: 500, metric: "missions_total", sort_order: 287, is_active: true, base_code: "missions_master", tier_level: 7, reward_amount: 1500000 },
  { code: "missions_master_1000", title: "Missionen-Master", description: "1000 Einsätze insgesamt erreicht", icon: "Target", tier: "obsidian", category: "missions", threshold: 1000, metric: "missions_total", sort_order: 288, is_active: true, base_code: "missions_master", tier_level: 8, reward_amount: 2650000 },
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
