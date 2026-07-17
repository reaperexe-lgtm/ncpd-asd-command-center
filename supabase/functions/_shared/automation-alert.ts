// Gemeinsamer Alarm-Helfer für automatisierte (per pg_cron ausgelöste) Edge
// Functions. Wird im äußeren catch-Block jeder Automations-Function
// aufgerufen und postet eine kurze Fehlermeldung in einen Discord-Kanal,
// damit ein Fehlschlag sofort auffällt statt nur lautlos in den
// Function-Logs zu verschwinden.
//
// Darf selbst NIE einen Fehler werfen (sonst würde die eigentliche
// Fehlerbehandlung der aufrufenden Function verdeckt werden).
export async function reportAutomationFailure(functionName: string, error: unknown) {
  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let channelId: string | undefined;

    if (supabaseUrl && serviceKey) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/permission_settings?select=role&permission_key=eq.automation_alert_channel_id`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        if (res.ok) {
          const rows = await res.json();
          const val = rows?.[0]?.role?.trim();
          if (val) channelId = val;
        }
      } catch (_e) { /* fall through to env fallback */ }
    }

    channelId ||= Deno.env.get("DISCORD_DIRECTOR_CHANNEL_ID") ||
      Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ||
      Deno.env.get("DISCORD_CHANNEL_ID") ||
      undefined;
    if (!channelId) return;

    const errMsg = error instanceof Error ? error.message : String(error);
    const content = [
      `⚠️ **Automatisierung fehlgeschlagen**`,
      `Function: \`${functionName}\``,
      `Zeit: ${new Date().toISOString()}`,
      `Fehler: ${errMsg}`,
    ].join("\n").slice(0, 1900);

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (_e) {
    // Absichtlich ignoriert - der Alarm-Mechanismus darf nie selbst crashen.
  }
}
