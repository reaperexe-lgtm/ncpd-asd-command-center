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

export async function deleteUserAccount(
  supabase: Pick<SupabaseClient, "auth" | "functions" | "from">,
  userId: string,
) {
  try {
    const headers = await getSupabaseFunctionAuthHeaders(supabase as any);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { userId },
      headers,
    });

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return { success: true, fallback: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      const roleDelete = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (roleDelete.error) {
        throw roleDelete.error;
      }

      const profileDelete = await supabase.from("profiles").delete().eq("id", userId);
      if (profileDelete.error) {
        throw profileDelete.error;
      }

      return { success: true, fallback: true, message };
    } catch (cleanupError) {
      return {
        success: false,
        fallback: true,
        message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      };
    }
  }
}
