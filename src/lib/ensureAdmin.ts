import { supabase } from "@/integrations/supabase/client";

export const ensureAdminAccess = async (userId?: string | null) => {
  if (!userId) return;

  const { data: existingRows, error: fetchErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (fetchErr) throw fetchErr;

  const roles = new Set((existingRows || []).map((row: any) => row.role));
  roles.add("admin");

  if (!Array.from(roles).some((role) => role !== "admin")) {
    roles.add("ausbilder");
  }

  const { error: upsertErr } = await supabase
    .from("user_roles")
    .upsert(Array.from(roles).map((role) => ({ user_id: userId, role })), { onConflict: "user_id,role" });

  if (upsertErr) throw upsertErr;

  await supabase.from("profiles").update({ is_approved: true, is_blocked: false } as any).eq("id", userId);
};
