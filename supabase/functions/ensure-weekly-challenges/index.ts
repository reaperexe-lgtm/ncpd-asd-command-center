import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Wöchentlicher Reset für Einsatz-Sprint & Verfolgungs-Marathon: Sonntag 20:00 Uhr Berlin.
// Muss identisch zu src/lib/weekBoundary.ts bleiben.
function getBerlinOffsetMs(date: Date): number {
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const berlinAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinAsLocal.getTime() - utcAsLocal.getTime();
}

function getChallengeWeekStartDateKey(reference: Date = new Date()): string {
  const offset = getBerlinOffsetMs(reference);
  const berlinNow = new Date(reference.getTime() + offset);

  const dayOfWeek = berlinNow.getUTCDay(); // 0 = Sonntag
  const candidate = new Date(berlinNow);
  candidate.setUTCDate(candidate.getUTCDate() - dayOfWeek);
  candidate.setUTCHours(20, 0, 0, 0);

  if (candidate.getTime() > berlinNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }

  const y = candidate.getUTCFullYear();
  const m = String(candidate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(candidate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_WEEKLY_CHALLENGES = [
  { title: "Einsatz-Sprint", description: "Erstelle 5 Einsätze diese Woche", metric: "missions_week", target: 5, reward_amount: 50000 },
  { title: "Verfolgungs-Marathon", description: "Erstelle 10 Verfolgungen diese Woche", metric: "pursuits_week", target: 10, reward_amount: 50000 },
  { title: "10-80-Sammler", description: "Erreiche 100 Verfolgungen insgesamt", metric: "pursuits_total", target: 100, reward_amount: 1000000 },
  { title: "Missionen-Master", description: "Erstelle 100 Einsätze insgesamt", metric: "missions_total", target: 100, reward_amount: 1000000 },
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

    // Nur prüfen, dass es ein eingeloggter Nutzer ist — JEDER approved
    // Nutzer darf das Anlegen der Wochen-Challenges auslösen, nicht nur Admins.
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

    const weekStartIso = getChallengeWeekStartDateKey();

    // Legacy-Einträge aus älteren Versionen entfernen.
    await admin.from("weekly_challenges").delete().eq("week_start", weekStartIso).eq("title", "Aktiver Pilot");

    const rows = DEFAULT_WEEKLY_CHALLENGES.map((c) => ({
      week_start: weekStartIso,
      title: c.title,
      description: c.description,
      metric: c.metric,
      target: c.target,
      reward_amount: c.reward_amount,
      is_active: true,
    }));

    // UPSERT auf UNIQUE(week_start, title): legt fehlende Challenges an und
    // korrigiert veraltete Beträge/Texte bestehender Zeilen. Kein Duplikat-Risiko.
    const { error: upsertError } = await admin
      .from("weekly_challenges")
      .upsert(rows, { onConflict: "week_start,title" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, week_start: weekStartIso }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ensure-weekly-challenges error", e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
