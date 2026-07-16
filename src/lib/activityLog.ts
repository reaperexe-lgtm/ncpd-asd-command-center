import { supabase } from "@/integrations/supabase/client";

export type LogCategory = 
  | "casino"
  | "einsatz"
  | "verfolgung"
  | "fluglizenz"
  | "bewerbungssperre"
  | "familie"
  | "admin"
  | "sanktion"
  | "meldung"
  | "general";

export async function logActivity(
  action: string,
  category: LogCategory,
  details: Record<string, unknown> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      category,
      details,
    } as any);
  } catch (e) {
    console.error("Activity log error:", e);
  }
}
