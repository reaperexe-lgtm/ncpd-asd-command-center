import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = ["admin", "director", "co_director", "supervisor"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey);

    let callerId: string | null = null;
    try {
      const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
      if (!claimsErr && claimsData?.claims?.sub) {
        callerId = claimsData.claims.sub as string;
      }
    } catch {
      callerId = null;
    }

    if (!callerId) {
      const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = userData.user.id;
    }

    const { data: callerRoles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (roleErr) {
      console.error("Role lookup failed:", roleErr);
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdminCaller = (callerRoles ?? []).some((row: { role: string }) =>
      ALLOWED_ROLES.includes(row.role)
    );

    if (!isAdminCaller) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    if (typeof userId !== "string" || !userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up local profile/role references first.
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    try {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteError) {
        const message = deleteError.message?.toLowerCase() ?? "";
        const isMissingUser = message.includes("not found") || message.includes("user not found") || message.includes("invalid") || message.includes("does not exist");
        if (!isMissingUser) {
          console.error("Error deleting auth user:", deleteError);
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (deleteErr) {
      const message = (deleteErr as Error).message?.toLowerCase() ?? "";
      const isMissingUser = message.includes("not found") || message.includes("user not found") || message.includes("invalid") || message.includes("does not exist");
      if (!isMissingUser) {
        console.error("Unexpected delete error:", deleteErr);
        return new Response(JSON.stringify({ error: (deleteErr as Error).message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
