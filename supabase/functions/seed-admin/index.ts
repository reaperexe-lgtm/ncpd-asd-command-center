import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "dn-00@asd.local";
  const password = "Admin123";
  const name = "Admin Director";
  const dienstnummer = "DN-00";

  // Check if admin already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const exists = existingUsers?.users?.some((u) => u.email === email);
  if (exists) {
    return new Response(JSON.stringify({ message: "Admin already exists" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, dienstnummer },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 500 });
  }

  const userId = userData.user.id;

  // Approve profile and set role to director
  await supabaseAdmin.from("profiles").update({ is_approved: true, name, dienstnummer }).eq("id", userId);
  await supabaseAdmin.from("user_roles").update({ role: "director" }).eq("user_id", userId);

  return new Response(
    JSON.stringify({ message: "Admin created", userId, dienstnummer, login: email }),
    { headers: { "Content-Type": "application/json" } }
  );
});
