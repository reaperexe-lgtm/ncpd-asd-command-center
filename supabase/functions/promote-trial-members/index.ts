import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find trial_member users whose profile was created >= 14 days ago
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: trialMembers, error: fetchError } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(created_at)")
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
        console.log(`Promoted user ${tm.user_id} from trial_member to member`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Promoted ${promoted} trial members to member`,
        checked: trialMembers?.length || 0,
        promoted,
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
