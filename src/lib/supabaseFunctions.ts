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

export async function cleanupOldTrialMemberExamResults(
  supabase: Pick<SupabaseClient, "from">,
) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: trialMemberRows, error: trialMemberError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "trial_member")
    .lt("created_at", cutoff);

  if (trialMemberError) {
    throw trialMemberError;
  }

  const userIds = Array.from(
    new Set(
      (trialMemberRows ?? [])
        .map((row: any) => row.user_id)
        .filter((value: string | null | undefined): value is string => Boolean(value)),
    ),
  );

  if (!userIds.length) {
    return { deletedTheory: 0, deletedPractical: 0 };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("dienstnummer")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  const dienstnummerValues = (profiles ?? [])
    .map((profile: any) => profile.dienstnummer)
    .filter((value: string | null | undefined): value is string => Boolean(value));

  if (!dienstnummerValues.length) {
    return { deletedTheory: 0, deletedPractical: 0 };
  }

  const [theoryResult, practicalResult] = await Promise.all([
    supabase.from("theory_exam_results").delete().in("dienstnummer", dienstnummerValues),
    supabase.from("practical_exam_results").delete().in("candidate_dienstnummer", dienstnummerValues),
  ]);

  return {
    deletedTheory: theoryResult.error ? 0 : 1,
    deletedPractical: practicalResult.error ? 0 : 1,
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
