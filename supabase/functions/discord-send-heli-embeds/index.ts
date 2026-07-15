import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_BOT_TOKEN nicht konfiguriert");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: { id?: string } = {};
    try { body = await req.json(); } catch { /* ignore */ }

    let query = supabase.from("heli_data_embeds").select("*");
    if (body.id) query = query.eq("id", body.id);
    const { data: rows, error } = await query;
    if (error) throw error;

    const results: any[] = [];

    for (const row of rows ?? []) {
      const payload = { embeds: [row.embed_json] };
      let msgId = row.discord_message_id as string | null;
      let res: Response;

      if (msgId) {
        res = await fetch(`${DISCORD_API}/channels/${row.channel_id}/messages/${msgId}`, {
          method: "PATCH",
          headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 404) {
          // Old message gone → send a new one
          msgId = null;
        }
      }

      if (!msgId) {
        res = await fetch(`${DISCORD_API}/channels/${row.channel_id}/messages`, {
          method: "POST",
          headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res!.ok) {
        const errText = await res!.text();
        throw new Error(`Discord API Fehler (${row.id}): ${res!.status} ${errText}`);
      }
      const msg = await res!.json();

      const { error: upErr } = await supabase
        .from("heli_data_embeds")
        .update({ discord_message_id: msg.id, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (upErr) throw upErr;

      results.push({ id: row.id, message_id: msg.id });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
