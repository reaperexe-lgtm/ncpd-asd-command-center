import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { awardAchievements, computeMetrics, MetricSnapshot } from "@/lib/achievements";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star,
};

const TIER_CLS: Record<string, string> = {
  bronze: "from-amber-700/30 to-amber-900/20 border-amber-700/50 text-amber-300",
  silver: "from-slate-400/30 to-slate-600/20 border-slate-400/50 text-slate-200",
  gold: "from-yellow-500/30 to-yellow-700/20 border-yellow-500/60 text-yellow-300",
  platinum: "from-cyan-300/30 to-purple-500/20 border-cyan-300/60 text-cyan-200",
};

const AchievementsCard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<MetricSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-achievements", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("name, dienstnummer").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: defs } = useQuery({
    queryKey: ["achievement-defs"],
    queryFn: async () => {
      const { data } = await supabase.from("achievement_definitions").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: owned, refetch: refetchOwned } = useQuery({
    queryKey: ["my-achievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_achievements").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const run = async () => {
      if (!user || !profile || loaded) return;
      setLoaded(true);
      const result = await awardAchievements(user.id, profile.name || "", profile.dienstnummer);
      setMetrics(result.metrics);
      if (result.newlyAwarded > 0) {
        toast.success(
          `🏆 ${result.newlyAwarded} neue${result.newlyAwarded === 1 ? "s" : ""} Achievement freigeschaltet! Melde dich bei der Direction, um deine 50.000$ Belohnung zu erhalten.`,
          { duration: 10000 }
        );
        refetchOwned();
      }
    };
    run();
  }, [user, profile, loaded, refetchOwned]);

  useEffect(() => {
    if (!user || !profile || metrics) return;
    computeMetrics(user.id, profile.name || "", profile.dienstnummer).then(setMetrics);
  }, [user, profile, metrics]);

  const ownedSet = new Set((owned || []).map((o: any) => o.achievement_code));
  const totalAwarded = ownedSet.size;
  const totalDefs = defs?.length || 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" /> Achievements
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{totalAwarded} / {totalDefs}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {(defs || []).map((d: any) => {
            const Icon = ICONS[d.icon] || Trophy;
            const isOwned = ownedSet.has(d.code);
            const value = metrics ? (metrics as any)[d.metric] || 0 : 0;
            const pct = Math.min(100, (value / d.threshold) * 100);
            return (
              <div
                key={d.id}
                className={`relative rounded-lg p-3 border bg-gradient-to-br ${
                  isOwned ? TIER_CLS[d.tier] || TIER_CLS.bronze : "from-muted/40 to-muted/10 border-border text-muted-foreground opacity-70"
                }`}
                title={d.description}
              >
                <div className="flex items-start gap-2 mb-1">
                  <Icon className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">{d.title}</p>
                    <p className="text-[10px] opacity-80 leading-tight">{d.description}</p>
                  </div>
                </div>
                {!isOwned && (
                  <div className="mt-1">
                    <Progress value={pct} className="h-1" />
                    <p className="text-[9px] mt-0.5 tabular-nums opacity-80">{value} / {d.threshold}</p>
                  </div>
                )}
                {isOwned && (
                  <p className="text-[9px] uppercase tracking-wide font-bold opacity-90 mt-1">✓ {d.tier}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementsCard;