import { supabase } from "@/integrations/supabase/client";
import { computeMetrics } from "@/lib/achievements";
import { getChallengeWeekStartDateKey } from "@/lib/weekBoundary";
import { toast } from "sonner";

// "cash" = Ingame-Geld, wird NICHT automatisch gutgeschrieben. Stattdessen wird
// die Direction per Discord benachrichtigt und zahlt manuell aus.
// "casino" = wird direkt aufs Gambling-Konto gutgeschrieben.
const getRewardDestination = (challenge: { title?: string; metric?: string }) => {
  if (challenge.title === "Einsatz-Sprint" || challenge.title === "Verfolgungs-Marathon") return "cash";
  return "casino";
};

// Ehemalige Wochen-Challenges, die jetzt als Achievements laufen (Lifetime-Metriken,
// keine Wochen-Resets). Bleibt hier synchron zu WeeklyChallengesCard.tsx.
const REMOVED_CHALLENGE_TITLES = ["10-80-Sammler", "Missionen-Master"];

/**
 * Prüft die aktiven Wochen-Challenges für einen Nutzer gegen seine aktuellen
 * Metriken und zahlt/meldet noch nicht ausgezahlte, aber erreichte Belohnungen aus.
 *
 * Wiederverwendbare Extraktion aus WeeklyChallengesCard.tsx (12.07.2026 Fix):
 * wird jetzt sowohl von der Karte selbst (beim Anzeigen) als auch direkt nach dem
 * Erstellen eines Einsatzes/einer Verfolgung aufgerufen, damit "missions_week" /
 * "pursuits_week" nicht mehr verpasst werden, nur weil niemand zufällig die
 * Achievements-Seite besucht hat, bevor der Wochenreset (Sonntag 20 Uhr Berlin)
 * den Zähler wieder auf 0 setzt.
 */
export async function checkAndClaimWeeklyChallenges(
  userId: string,
  userName: string,
  dienstnummer?: string | null,
) {
  const weekStartIso = getChallengeWeekStartDateKey();

  const { data: challenges } = await supabase
    .from("weekly_challenges")
    .select("*")
    .eq("week_start", weekStartIso)
    .eq("is_active", true);

  const visibleChallenges = (challenges || []).filter(
    (c: any) => c.title !== "Aktiver Pilot" && !REMOVED_CHALLENGE_TITLES.includes(c.title),
  );
  if (!visibleChallenges.length) return;

  const { data: completions } = await supabase
    .from("challenge_completions")
    .select("*")
    .eq("user_id", userId);

  const metrics = await computeMetrics(userId, userName, dienstnummer);

  for (const c of visibleChallenges) {
    const value = (metrics as any)[c.metric] || 0;
    const existing = completions?.find((x: any) => x.challenge_id === c.id);
    if (existing?.reward_paid) continue;
    if (value < c.target) continue;

    try {
      // Ensure a completion row exists and atomically flip reward_paid=false -> true.
      // This avoids duplicate notifications when multiple clients/runs race.
      await supabase.from("challenge_completions").upsert(
        { challenge_id: c.id, user_id: userId, reward_paid: false },
        { onConflict: "challenge_id,user_id" },
      );

      const { data: updated } = await supabase
        .from("challenge_completions")
        .update({ reward_paid: true })
        .eq("challenge_id", c.id)
        .eq("user_id", userId)
        .eq("reward_paid", false)
        .select("id");

      // If we didn't transition false->true, someone else already processed this.
      if (!updated || (Array.isArray(updated) && updated.length === 0)) continue;

      const destination = getRewardDestination(c);
      if (destination === "casino") {
        const { data: bal } = await supabase.from("casino_balances").select("balance").eq("user_id", userId).maybeSingle();
        const newBal = (bal?.balance || 0) + c.reward_amount;
        await supabase.from("casino_balances").upsert({ user_id: userId, balance: newBal } as any, { onConflict: "user_id" });
        toast.success(`🏆 Challenge "${c.title}" geschafft! +$${c.reward_amount.toLocaleString()} auf das Gambling-Konto`);
      } else {
        try {
          await supabase.functions.invoke("discord-notify", {
            body: {
              type: "challenge_completed",
              data: {
                user_id: userId,
                user_name: userName || "",
                dienstnummer: dienstnummer ?? null,
                challenge_title: c.title,
                challenge_description: c.description,
                reward_amount: c.reward_amount,
              },
            },
          });
          toast.success(`🏆 Challenge "${c.title}" geschafft! Die Direction wurde per Discord über die Auszahlung von $${c.reward_amount.toLocaleString()} benachrichtigt.`);
        } catch (e) {
          toast.success(`🏆 Challenge "${c.title}" geschafft! Bitte melde dich bei der Direction für deine $${c.reward_amount.toLocaleString()}.`);
        }
      }
    } catch (e) {
      console.error("[weeklyChallenges] error processing completion:", e);
    }
  }
}
