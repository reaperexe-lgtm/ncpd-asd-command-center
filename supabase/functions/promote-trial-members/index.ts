import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

async function sendChannelMessage(botToken: string, channelId: string, message: string) {
  const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!msgRes.ok) {
    const err = await msgRes.text();
    console.error(`Discord channel message failed: ${err}`);
  }
  return msgRes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: trialMembers, error: fetchError } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(created_at, name)")
      .eq("role", "trial_member");

    if (fetchError) {
      console.error("Error fetching trial members:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toPromote = (trialMembers || []).filter((tm: any) => {
      const createdAt = new Date(tm.profiles.created_at);
      return createdAt <= fourteenDaysAgo;
    });

    let promoted = 0;
    const promotedNames: string[] = [];

    for (const tm of toPromote) {
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ role: "member" })
        .eq("user_id", tm.user_id)
        .eq("role", "trial_member");

      if (updateError) {
        console.error(`Error promoting user ${tm.user_id}:`, updateError);
      } else {
        promoted++;
        const name = (tm as any).profiles?.name || "Unbekannt";
        promotedNames.push(name);
        console.log(`Promoted user ${tm.user_id} (${name}) from trial_member to member`);

        // Log activity
        await supabase.from("activity_logs").insert({
          user_id: tm.user_id,
          action: `Automatische Beförderung: ${name} wurde nach 14 Tagen von Trial Member zu Member befördert`,
          category: "rolle",
          details: { old_role: "trial_member", new_role: "member", name, automatic: true },
        });
      }
    }

    // Send Discord notification if anyone was promoted
    if (promoted > 0) {
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
      const channelId = Deno.env.get("DISCORD_CHANNEL_ID");

      if (botToken && channelId) {
        const nameList = promotedNames.map((n) => `• **${n}**`).join("\n");
        const message = `🎉 **Automatische Beförderung**\n━━━━━━━━━━━━━━━\n${promoted} Trial Member ${promoted === 1 ? "wurde" : "wurden"} nach 14 Tagen automatisch zum Member befördert:\n\n${nameList}`;
        await sendChannelMessage(botToken, channelId, message);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Promoted ${promoted} trial members to member`,
        checked: trialMembers?.length || 0,
        promoted,
        promotedNames,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
