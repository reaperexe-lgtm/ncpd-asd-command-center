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