import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NEW_PASSWORD = "ASD123";
const ALLOWED_ROLES = ["admin", "director", "co_director"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("reset-user-password: missing/invalid auth header");
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Validate the caller's JWT using an anon client (signing-keys friendly)
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    let callerId: string | null = null;
    try {
      const { data: claimsData, error: claimsErr } = await anonClient.auth
        .getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        console.error("reset-user-password: getClaims failed", claimsErr);
      } else {
        callerId = claimsData.claims.sub as string;
      }
    } catch (e) {
      console.error("reset-user-password: getClaims threw", e);
    }

    // Fallback: getUser via anon client with Bearer token
    if (!callerId) {
      const { data: userData, error: userErr } = await anonClient.auth.getUser(
        token,
      );
      if (userErr || !userData?.user) {
        console.error("reset-user-password: getUser failed", userErr);
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = userData.user.id;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerRole, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleErr) {
      console.error("reset-user-password: role lookup failed", roleErr);
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!callerRole || !ALLOWED_ROLES.includes(callerRole.role)) {
      console.error(
        "reset-user-password: insufficient permissions",
        callerId,
        callerRole?.role,
      );
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: NEW_PASSWORD,
    });

    if (error) {
      console.error("Password reset error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, newPassword: NEW_PASSWORD }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});