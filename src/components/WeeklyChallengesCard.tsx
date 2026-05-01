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

  // Auto-seed default challenges if none exist for this week
  useEffect(() => {
    if (!challenges || challenges.length > 0) return;
    const seed = async () => {
      await supabase.from("weekly_challenges").insert([
        { week_start: weekStartIso, title: "Einsatz-Sprint", description: "Erstelle 5 Einsätze diese Woche", metric: "missions_total", target: 5, reward_amount: 50000 },
        { week_start: weekStartIso, title: "Verfolgungs-Marathon", description: "10 Verfolgungen diese Woche", metric: "pursuits_week", target: 10, reward_amount: 100000 },
        { week_start: weekStartIso, title: "Aktiver Pilot", description: "2 Übungen besucht", metric: "uebungen_attended", target: 2, reward_amount: 30000 },
      ]);
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
          // Pay reward
          const { data: bal } = await supabase.from("casino_balances").select("balance").eq("user_id", user.id).maybeSingle();
          const newBal = (bal?.balance || 0) + c.reward_amount;
          await supabase.from("casino_balances").upsert({ user_id: user.id, balance: newBal } as any, { onConflict: "user_id" });
          await supabase.from("challenge_completions").update({ reward_paid: true }).eq("challenge_id", c.id).eq("user_id", user.id);
          toast.success(`🏆 Challenge "${c.title}" geschafft! +$${c.reward_amount.toLocaleString()}`);
          refetchComp();
        }
      }
    };
    run();
  }, [user, profile, challenges, completions, refetchComp]);

  if (!challenges?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" /> Wochen-Challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {challenges.map((c: any) => {
          const done = completions?.find((x: any) => x.challenge_id === c.id)?.reward_paid;
          return (
            <div key={c.id} className={`p-3 rounded border ${done ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold flex items-center gap-1">{done && "✓"} {c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 flex items-center gap-1 shrink-0">
                  <Gift className="w-3 h-3" /> ${c.reward_amount.toLocaleString()}
                </span>
              </div>
              {done && <p className="text-[10px] text-emerald-400 mt-1">Belohnung kassiert ✓</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WeeklyChallengesCard;