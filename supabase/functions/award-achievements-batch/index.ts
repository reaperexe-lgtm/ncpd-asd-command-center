import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { runAchievementCheckForUser } from "../_shared/achievement-engine.ts";
import { reportAutomationFailure } from "../_shared/automation-alert.ts";

// Läuft periodisch (Cron) für ALLE freigeschalteten Nutzer mit Service-Role -
// im Gegensatz zu award-achievements, das nur ausgelöst wird, wenn EIN Nutzer
// selbst seine Achievements-Seite öffnet. Behebt zwei Bugs:
//  - Achievements wurden nicht vergeben, wenn ein Nutzer die Seite nie besucht
//  - Die Direction wurde dadurch auch nie über erreichte Wochenziele
//    (missions_week_5 / pursuits_week_10) informiert
// Einmaliger Aufruf holt zusätzlich alle bisher verpassten Vergaben/Meldungen
// rückwirkend nach (Backfill).

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id")
      .eq("is_approved", true)
      .eq("is_blocked", false);
    if (error) throw error;

    let totalNewlyAwarded = 0;
    const errors: { user_id: string; message: string }[] = [];

    for (const p of profiles || []) {
      try {
        const result = await runAchievementCheckForUser(admin, p.id);
        totalNewlyAwarded += result.newlyAwarded;
      } catch (e) {
        errors.push({ user_id: p.id, message: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: (profiles || []).length, totalNewlyAwarded, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    await reportAutomationFailure("award-achievements-batch", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
