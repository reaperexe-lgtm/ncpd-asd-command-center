import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Gift } from "lucide-react";
import { computeMetrics } from "@/lib/achievements";
import { toast } from "sonner";

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const getRewardDestination = (challenge: { title?: string; metric?: string }) => {
  if (challenge.title === "Einsatz-Sprint" || challenge.title === "Verfolgungs-Marathon") return "cash";
  return "casino";
};

const DEFAULT_WEEKLY_CHALLENGES = [
  { title: "Einsatz-Sprint", description: "Erstelle 5 Einsätze diese Woche", metric: "missions_week", target: 5, reward_amount: 50000 },
  { title: "Verfolgungs-Marathon", description: "Erstelle 10 Verfolgungen diese Woche", metric: "pursuits_week", target: 10, reward_amount: 100000 },
  { title: "10-80-Sammler", description: "Erreiche 100 Verfolgungen insgesamt", metric: "pursuits_total", target: 100, reward_amount: 100000 },
  { title: "Missionen-Master", description: "Erstelle 100 Einsätze insgesamt", metric: "missions_total", target: 100, reward_amount: 100000 },
];

const WeeklyChallengesCard = () => {
  const { user } = useAuth();
  const weekStartIso = startOfWeek().toISOString().slice(0, 10);

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

  // Auto-seed default challenges for this week and remove legacy entries
  useEffect(() => {
    const shouldSeed = !challenges || challenges.length === 0 || (challenges || []).some((c: any) => c.title === "Aktiver Pilot");
    if (!shouldSeed) return;

    const seed = async () => {
      const rows = DEFAULT_WEEKLY_CHALLENGES.map((c) => ({
        week_start: weekStartIso,
        title: c.title,
        description: c.description,
        metric: c.metric,
        target: c.target,
        reward_amount: c.reward_amount,
        is_active: true,
      }));

      await supabase.from("weekly_challenges").delete().eq("week_start", weekStartIso).eq("is_active", true);
      await supabase.from("weekly_challenges").insert(rows);
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
            const { data: bal } = await supabase.from("casino_balances").select("balance").eq("user_id", user.id).maybeSingle();
            const newBal = (bal?.balance || 0) + c.reward_amount;
            await supabase.from("casino_balances").upsert({ user_id: user.id, balance: newBal } as any, { onConflict: "user_id" });
            toast.success(`🏆 Challenge "${c.title}" geschafft! +$${c.reward_amount.toLocaleString()} auf das Gambling-Konto`);
          } else {
            toast.success(`🏆 Challenge "${c.title}" geschafft! Auszahlung in $${c.reward_amount.toLocaleString()} erfolgt`);
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
                {rewardDestination === "cash" ? "Auszahlung in $" : "Gutschrift auf das Gambling-Konto"}
              </p>
              {done && <p className="text-[10px] text-emerald-400 mt-1">Belohnung kassiert ✓</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WeeklyChallengesCard;