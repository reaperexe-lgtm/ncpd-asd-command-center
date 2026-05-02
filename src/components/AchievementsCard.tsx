import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star, Medal, Gem } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { awardAchievements, computeMetrics, MetricSnapshot } from "@/lib/achievements";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star,
};

const TIER_CLS: Record<string, string> = {
  bronze: "from-amber-700/40 to-amber-900/30 border-amber-600/70 text-amber-100",
  silver: "from-slate-400/40 to-slate-600/30 border-slate-300/70 text-slate-50",
  gold: "from-yellow-500/40 to-yellow-700/30 border-yellow-400/80 text-yellow-50",
  platinum: "from-cyan-300/40 to-purple-500/30 border-cyan-200/80 text-cyan-50",
  diamond: "from-fuchsia-400/40 to-indigo-500/30 border-fuchsia-200/80 text-fuchsia-50",
};

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin", diamond: "Diamant",
};

const TIER_MEDAL_CLS: Record<string, string> = {
  bronze: "text-amber-500",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-cyan-300",
  diamond: "text-fuchsia-300",
};

const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"];

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

  // Group by base_code: tiered achievements share a base_code; standalone ones use their own code as base.
  type Group = {
    base: string;
    title: string;
    description: string;
    icon: string;
    metric: string;
    tiers: any[]; // sorted by threshold ASC
  };
  const groupsMap = new Map<string, Group>();
  for (const d of (defs || []) as any[]) {
    const key = d.base_code || d.code;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        base: key,
        title: d.title?.replace(/\s+(Bronze|Silber|Gold|Platin|Diamant)\s*$/i, "").trim() || d.title,
        description: d.description,
        icon: d.icon,
        metric: d.metric,
        tiers: [],
      });
    }
    groupsMap.get(key)!.tiers.push(d);
  }
  const groups = Array.from(groupsMap.values()).map((g) => ({
    ...g,
    tiers: g.tiers.sort((a, b) => (a.threshold || 0) - (b.threshold || 0)),
  }));

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" /> Achievements
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{totalAwarded} / {totalDefs}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((g) => {
            const Icon = ICONS[g.icon] || Trophy;
            const value = metrics ? (metrics as any)[g.metric] || 0 : 0;
            const ownedTiers = g.tiers.filter((t) => ownedSet.has(t.code));
            const highest = ownedTiers[ownedTiers.length - 1];
            const next = g.tiers.find((t) => !ownedSet.has(t.code));
            const targetThreshold = next?.threshold ?? g.tiers[g.tiers.length - 1]?.threshold ?? 1;
            const pct = Math.min(100, (value / targetThreshold) * 100);
            const cardCls = highest
              ? TIER_CLS[highest.tier] || TIER_CLS.bronze
              : "from-muted/40 to-muted/10 border-border text-muted-foreground";
            return (
              <div
                key={g.base}
                className={`relative rounded-lg p-3 border-2 bg-gradient-to-br ${cardCls}`}
                title={g.description}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className="w-6 h-6 shrink-0 text-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold leading-tight text-foreground drop-shadow-sm">{g.title}</p>
                    <p className="text-xs leading-snug text-foreground/85 mt-0.5">{g.description}</p>
                  </div>
                  <span className="text-xs tabular-nums font-extrabold shrink-0 bg-background/40 px-1.5 py-0.5 rounded text-foreground">
                    {ownedTiers.length}/{g.tiers.length}
                  </span>
                </div>

                {/* Medal row */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  {g.tiers.map((t) => {
                    const ownedTier = ownedSet.has(t.code);
                    const MedalIcon = t.tier === "diamond" ? Gem : Medal;
                    return (
                      <div
                        key={t.code}
                        className={`flex flex-col items-center gap-0.5 flex-1 ${
                          ownedTier ? TIER_MEDAL_CLS[t.tier] || "text-foreground" : "text-foreground/30"
                        }`}
                        title={`${TIER_LABELS[t.tier] || t.tier} · ab ${t.threshold}`}
                      >
                        <MedalIcon className={`w-5 h-5 ${ownedTier ? "drop-shadow-glow" : ""}`} />
                        <span className="text-[10px] tabular-nums font-bold">{t.threshold}</span>
                      </div>
                    );
                  })}
                </div>

                {next ? (
                  <div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs mt-1 tabular-nums font-semibold text-foreground/90">
                      {value} / {next.threshold} → nächste Medaille: {TIER_LABELS[next.tier] || next.tier}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-wide font-extrabold text-foreground">
                    ✓ Alle Medaillen erreicht
                  </p>
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