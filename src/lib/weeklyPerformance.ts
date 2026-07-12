// ⚠️ SUPERSEDED (12.07.2026): Dieses System lief parallel zu den Wochen-Challenges
// (WeeklyChallengesCard: "Einsatz-Sprint" / "Verfolgungs-Marathon") und hätte bei
// jedem Einsatz/jeder Verfolgung eine ZWEITE, redundante Discord-Auszahlungsanfrage
// an die Direction geschickt. Die Aufrufe in EinsatzPage.tsx / VerfolgungPage.tsx
// wurden entfernt. Datei bewusst nicht gelöscht, falls sie referenziert wird —
// bitte NICHT wieder verdrahten, ohne vorher mit WeeklyChallengesCard abzugleichen.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let inFlight: Promise<void> | null = null;

/**
 * Fires the weekly-performance-check edge function.
 * - Idempotent server-side (DB unique constraint)
 * - Single-flight client-side to avoid duplicate calls per session
 * - Shows a celebratory toast when the reward is granted on this call
 */
export async function checkWeeklyPerformance() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      const { data, error } = await supabase.functions.invoke("weekly-performance-check");
      if (error) return;
      if (data?.qualified) {
        toast.success(
          `🎉 Wochen-Leistungsbelohnung freigeschaltet! 50.000$ — die Direction wurde benachrichtigt.`,
          { duration: 12000 },
        );
      }
    } catch {
      // silently ignore – idempotent
    } finally {
      // allow next check after 30s (e.g. after creating another mission)
      setTimeout(() => { inFlight = null; }, 30_000);
    }
  })();
  return inFlight;
}