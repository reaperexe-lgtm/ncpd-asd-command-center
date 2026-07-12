import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Gift } from "lucide-react";
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

const DEFAULT_WEEKLY_CHALLENGES = [
  { title: "Einsatz-Sprint", description: "Erstelle 5 Einsätze diese Woche", metric: "missions_week", target: 5, reward_amount: 50000 },
  { title: "Verfolgungs-Marathon", description: "Erstelle 10 Verfolgungen diese Woche", metric: "pursuits_week", target: 10, reward_amount: 50000 },
  { title: "10-80-Sammler", description: "Erreiche 100 Verfolgungen insgesamt", metric: "pursuits_total", target: 100, reward_amount: 1000000 },
  { title: "Missionen-Master", description: "Erstelle 100 Einsätze insgesamt", metric: "missions_total", target: 100, reward_amount: 1000000 },
];

const WeeklyChallengesCard = () => {
  const { user } = useAuth();
  // Wochen-Reset für Einsatz-Sprint & Verfolgungs-Marathon: jeden Sonntag 20:00 Uhr (Berlin)
  const weekStartIso = getChallengeWeekStartDateKey();

  const { data: profile } = useQuery({
    queryKey: ["profile-for-challenges", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("name, dienstnummer").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: challenges, refetch } = useQuery({
    queryKey: ["weekly-challenges", weekStartIso],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_challenges").select("*").eq("week_start", weekStartIso).eq("is_active", true);
      return data || [];
    },
    // Sorgt dafür, dass eine offen gelassene Seite den Sonntag-20-Uhr-Reset
    // auch ohne manuelles Neuladen mitbekommt.
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: completions, refetch: refetchComp } = useQuery({
    queryKey: ["my-challenge-completions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("challenge_completions").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Idempotent seeding über eine Edge Function mit Service-Role: läuft für JEDEN
  // angemeldeten Nutzer, nicht nur für Admins (RLS auf weekly_challenges erlaubt
  // Schreibzugriff nur Admins — vorher blieb die Karte leer, wenn kein Admin die
  // Seite als Erster in der Woche geladen hatte). Die Function selbst nutzt UPSERT
  // auf (week_start, title), also auch bei Mehrfachaufrufen keine Duplikate.
  useEffect(() => {
    if (!challenges) return;

    const hasLegacy = challenges.some((c: any) => c.title === "Aktiver Pilot");
    const needsUpdate = DEFAULT_WEEKLY_CHALLENGES.some((def) => {
      const existing = challenges.find((c: any) => c.title === def.title);
      if (!existing) return true;
      return (
        existing.reward_amount !== def.reward_amount ||
        existing.description !== def.description ||
        existing.target !== def.target ||
        existing.metric !== def.metric
      );
    });

    if (!hasLegacy && !needsUpdate) return;

    const seed = async () => {
      let edgeFnOk = false;
      try {
        const { error } = await supabase.functions.invoke("ensure-weekly-challenges");
        if (error) throw error;
        edgeFnOk = true;
      } catch (e) {
        console.error(
          "[WeeklyChallenges] ensure-weekly-challenges Edge Function fehlgeschlagen " +
          "(evtl. noch nicht deployed?). Fallback auf Direct-Write (nur für Admins).",
          e,
        );
      }

      if (!edgeFnOk) {
        // Fallback: funktioniert nur, wenn der aktuelle Nutzer Admin ist (RLS).
        // Verhindert, dass die Karte komplett leer bleibt, falls die Edge Function
        // (noch) nicht deployed ist.
        try {
          if (hasLegacy) {
            await supabase.from("weekly_challenges").delete().eq("week_start", weekStartIso).eq("title", "Aktiver Pilot");
          }
          const rows = DEFAULT_WEEKLY_CHALLENGES.map((c) => ({
            week_start: weekStartIso,
            title: c.title,
            description: c.description,
            metric: c.metric,
            target: c.target,
            reward_amount: c.reward_amount,
            is_active: true,
          }));
          const { error: fallbackError } = await supabase
            .from("weekly_challenges")
            .upsert(rows, { onConflict: "week_start,title" });
          if (fallbackError) {
            console.error(
              "[WeeklyChallenges] Fallback-Write ebenfalls fehlgeschlagen (kein Admin? RLS?). " +
              "Wochen-Challenges bleiben leer, bis ensure-weekly-challenges deployed ist.",
              fallbackError,
            );
          }
        } catch (e) {
          console.error("[WeeklyChallenges] Fallback-Write Exception:", e);
        }
      }

      refetch();
    };
    seed();
  }, [challenges, weekStartIso, refetch]);

  // Auto-claim rewards when conditions met
  useEffect(() => {
    if (!user || !profile || !challenges?.length) return;
    const run = async () => {
      const metrics = await computeMetrics(user.id, profile.name || "", profile.dienstnummer);
      for (const c of challenges) {
        const value = (metrics as any)[c.metric] || 0;
        const existing = completions?.find((x: any) => x.challenge_id === c.id);
        if (existing?.reward_paid) continue;
        if (value >= c.target) {
          if (!existing) {
            await supabase.from("challenge_completions").insert({ challenge_id: c.id, user_id: user.id, reward_paid: false });
          }

          const destination = getRewardDestination(c);
          if (destination === "casino") {
            // Direkt aufs Gambling-Konto gutschreiben
            const { data: bal } = await supabase.from("casino_balances").select("balance").eq("user_id", user.id).maybeSingle();
            const newBal = (bal?.balance || 0) + c.reward_amount;
            await supabase.from("casino_balances").upsert({ user_id: user.id, balance: newBal } as any, { onConflict: "user_id" });
            toast.success(`🏆 Challenge "${c.title}" geschafft! +$${c.reward_amount.toLocaleString()} auf das Gambling-Konto`);
          } else {
            // Ingame-Geld: keine automatische Gutschrift, stattdessen Discord-Benachrichtigung an die Direction
            try {
              await supabase.functions.invoke("discord-notify", {
                body: {
                  type: "challenge_completed",
                  data: {
                    user_id: user.id,
                    user_name: profile.name || "",
                    dienstnummer: profile.dienstnummer ?? null,
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

          await supabase.from("challenge_completions").update({ reward_paid: true }).eq("challenge_id", c.id).eq("user_id", user.id);
          refetchComp();
        }
      }
    };
    run();
  }, [user, profile, challenges, completions, refetchComp]);

  const visibleChallenges = (challenges || []).filter((c: any) => c.title !== "Aktiver Pilot");
  if (!visibleChallenges.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" /> Wochen-Challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleChallenges.map((c: any) => {
          const done = completions?.find((x: any) => x.challenge_id === c.id)?.reward_paid;
          const rewardDestination = getRewardDestination(c);
          return (
            <div key={c.id} className={`p-3 rounded border ${done ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold flex items-center gap-1">{done && "✓"} {c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${rewardDestination === "cash" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
                  <Gift className="w-3 h-3" /> ${c.reward_amount.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] mt-1 text-muted-foreground">
                {rewardDestination === "cash" ? "Auszahlung durch Direction (Discord-Benachrichtigung)" : "Gutschrift auf das Gambling-Konto"}
              </p>
              {done && <p className="text-[10px] text-emerald-400 mt-1">Belohnung {rewardDestination === "cash" ? "gemeldet" : "kassiert"} ✓</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WeeklyChallengesCard;
