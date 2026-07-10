import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSupabaseFunctionAuthHeaders(
  supabase: Pick<SupabaseClient, "auth">,
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("Keine Authentifizierung verfügbar");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}
