import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star, Medal, Gem } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { awardAchievements, MetricSnapshot } from "@/lib/achievements";
import { getSupabaseFunctionAuthHeaders } from "@/lib/supabaseFunctions";
import { toast } from "sonner";
import { MISSIONS_PARTICIPATION_ACHIEVEMENT_DEFS } from "@/lib/achievementDefinitions";

// Achievements, die per SQL-Migration existieren sollten. Falls die Migration auf der
// laufenden DB (noch) nicht ausgeführt wurde, zieht ensureAchievementDefinitions() sie
// per Edge Function (Service-Role) nach — siehe supabase/functions/ensure-achievement-definitions.
const REQUIRED_ACHIEVEMENT_CODES = [
  "pursuits_sammler_10", "pursuits_sammler_50", "pursuits_sammler_150", "pursuits_sammler_200",
  "pursuits_sammler_300", "pursuits_sammler_400", "pursuits_sammler_500", "pursuits_sammler_1000",
  "missions_master_10", "missions_master_50", "missions_master_150", "missions_master_200",
  "missions_master_300", "missions_master_400", "missions_master_500", "missions_master_1000",
  "missions_presence_10", "missions_presence_50", "missions_presence_150", "missions_presence_200",
  "missions_presence_300", "missions_presence_400", "missions_presence_500", "missions_presence_1000",
];
const REQUIRED_ACHIEVEMENT_DEFS_FALLBACK = [
  { code: "pursuits_sammler_10", title: "10-80-Lehrling", description: "10 Verfolgungen insgesamt erreicht", icon: "Car", tier: "bronze", category: "pursuits", threshold: 10, metric: "pursuits_total", sort_order: 271, is_active: true, base_code: "pursuits_sammler", tier_level: 1, reward_amount: 100000 },
  { code: "pursuits_sammler_50", title: "10-80-Geselle", description: "50 Verfolgungen insgesamt erreicht", icon: "Car", tier: "silver", category: "pursuits", threshold: 50, metric: "pursuits_total", sort_order: 272, is_active: true, base_code: "pursuits_sammler", tier_level: 2, reward_amount: 250000 },
  { code: "pursuits_sammler_150", title: "10-80-Experte", description: "150 Verfolgungen insgesamt erreicht", icon: "Car", tier: "gold", category: "pursuits", threshold: 150, metric: "pursuits_total", sort_order: 273, is_active: true, base_code: "pursuits_sammler", tier_level: 3, reward_amount: 500000 },
  { code: "pursuits_sammler_200", title: "10-80-Spezialist", description: "200 Verfolgungen insgesamt erreicht", icon: "Car", tier: "platinum", category: "pursuits", threshold: 200, metric: "pursuits_total", sort_order: 274, is_active: true, base_code: "pursuits_sammler", tier_level: 4, reward_amount: 750000 },
  { code: "pursuits_sammler_300", title: "10-80-Champion", description: "300 Verfolgungen insgesamt erreicht", icon: "Car", tier: "diamond", category: "pursuits", threshold: 300, metric: "pursuits_total", sort_order: 275, is_active: true, base_code: "pursuits_sammler", tier_level: 5, reward_amount: 1000000 },
  { code: "pursuits_sammler_400", title: "10-80-Elite", description: "400 Verfolgungen insgesamt erreicht", icon: "Car", tier: "emerald", category: "pursuits", threshold: 400, metric: "pursuits_total", sort_order: 276, is_active: true, base_code: "pursuits_sammler", tier_level: 6, reward_amount: 1250000 },
  { code: "pursuits_sammler_500", title: "10-80-Meister", description: "500 Verfolgungen insgesamt erreicht", icon: "Car", tier: "ruby", category: "pursuits", threshold: 500, metric: "pursuits_total", sort_order: 277, is_active: true, base_code: "pursuits_sammler", tier_level: 7, reward_amount: 1500000 },
  { code: "pursuits_sammler_1000", title: "10-80-Sammler", description: "1000 Verfolgungen insgesamt erreicht", icon: "Car", tier: "obsidian", category: "pursuits", threshold: 1000, metric: "pursuits_total", sort_order: 278, is_active: true, base_code: "pursuits_sammler", tier_level: 8, reward_amount: 2650000 },
  { code: "missions_master_10", title: "Missionen-Lehrling", description: "10 Einsätze insgesamt erreicht", icon: "Target", tier: "bronze", category: "missions", threshold: 10, metric: "missions_total", sort_order: 281, is_active: true, base_code: "missions_master", tier_level: 1, reward_amount: 100000 },
  { code: "missions_master_50", title: "Missionen-Geselle", description: "50 Einsätze insgesamt erreicht", icon: "Target", tier: "silver", category: "missions", threshold: 50, metric: "missions_total", sort_order: 282, is_active: true, base_code: "missions_master", tier_level: 2, reward_amount: 250000 },
  { code: "missions_master_150", title: "Missionen-Experte", description: "150 Einsätze insgesamt erreicht", icon: "Target", tier: "gold", category: "missions", threshold: 150, metric: "missions_total", sort_order: 283, is_active: true, base_code: "missions_master", tier_level: 3, reward_amount: 500000 },
  { code: "missions_master_200", title: "Missionen-Spezialist", description: "200 Einsätze insgesamt erreicht", icon: "Target", tier: "platinum", category: "missions", threshold: 200, metric: "missions_total", sort_order: 284, is_active: true, base_code: "missions_master", tier_level: 4, reward_amount: 750000 },
  { code: "missions_master_300", title: "Missionen-Champion", description: "300 Einsätze insgesamt erreicht", icon: "Target", tier: "diamond", category: "missions", threshold: 300, metric: "missions_total", sort_order: 285, is_active: true, base_code: "missions_master", tier_level: 5, reward_amount: 1000000 },
  { code: "missions_master_400", title: "Missionen-Elite", description: "400 Einsätze insgesamt erreicht", icon: "Target", tier: "emerald", category: "missions", threshold: 400, metric: "missions_total", sort_order: 286, is_active: true, base_code: "missions_master", tier_level: 6, reward_amount: 1250000 },
  { code: "missions_master_500", title: "Missionen-Meister", description: "500 Einsätze insgesamt erreicht", icon: "Target", tier: "ruby", category: "missions", threshold: 500, metric: "missions_total", sort_order: 287, is_active: true, base_code: "missions_master", tier_level: 7, reward_amount: 1500000 },
  { code: "missions_master_1000", title: "Missionen-Master", description: "1000 Einsätze insgesamt erreicht", icon: "Target", tier: "obsidian", category: "missions", threshold: 1000, metric: "missions_total", sort_order: 288, is_active: true, base_code: "missions_master", tier_level: 8, reward_amount: 2650000 },
  ...MISSIONS_PARTICIPATION_ACHIEVEMENT_DEFS,
];

const ICONS: Record<string, any> = {
  Trophy, Target, Car, FileText, ClipboardList, GraduationCap, BookOpen, Award, Zap, Crown, Coins, Star,
};

const TIER_CLS: Record<string, string> = {
  bronze: "from-amber-700/40 to-amber-900/30 border-amber-600/70 text-amber-100",
  silver: "from-slate-400/40 to-slate-600/30 border-slate-300/70 text-slate-50",
  gold: "from-yellow-500/40 to-yellow-700/30 border-yellow-400/80 text-yellow-50",
  platinum: "from-cyan-300/40 to-purple-500/30 border-cyan-200/80 text-cyan-50",
  diamond: "from-fuchsia-400/40 to-indigo-500/30 border-fuchsia-200/80 text-fuchsia-50",
  emerald: "from-emerald-400/40 to-teal-600/30 border-emerald-200/80 text-emerald-50",
  ruby: "from-red-500/40 to-rose-700/30 border-red-300/80 text-red-50",
  obsidian: "from-neutral-200/40 via-zinc-500/30 to-black/40 border-white/80 text-white",
};

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin", diamond: "Diamant",
  emerald: "Smaragd", ruby: "Rubin", obsidian: "Obsidian",
};

const TIER_MEDAL_CLS: Record<string, string> = {
  bronze: "text-amber-500",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-cyan-300",
  diamond: "text-fuchsia-300",
  emerald: "text-emerald-300",
  ruby: "text-red-400",
  obsidian: "text-white",
};

const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "diamond", "emerald", "ruby", "obsidian"];

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("de-DE")}$`;
}

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

  const { data: defs, refetch: refetchDefs } = useQuery({
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

  // Selbstheilung: falls die achievement_definitions-Migration auf der laufenden DB
  // nicht ausgeführt wurde, fehlende Einträge (10-80-Sammler- und Missionen-Master-
  // Stufen) über eine Edge Function mit Service-Role nachziehen — läuft für
  // JEDEN angemeldeten Nutzer, nicht nur Admins (RLS erlaubt Insert nur Admins direkt).
  const [defsSeedAttempted, setDefsSeedAttempted] = useState(false);
  useEffect(() => {
    if (!user || !defs || defsSeedAttempted) return;
    const existingCodes = new Set(defs.map((d: any) => d.code));
    const missingCodes = REQUIRED_ACHIEVEMENT_CODES.filter((c) => !existingCodes.has(c));
    if (!missingCodes.length) return;
    setDefsSeedAttempted(true);

    const seedDefs = async () => {
      let edgeFnOk = false;
      try {
        const headers = await getSupabaseFunctionAuthHeaders(supabase as any);
        const { error } = await supabase.functions.invoke("ensure-achievement-definitions", { headers });
        if (error) throw error;
        edgeFnOk = true;
      } catch (e) {
        console.error(
          "[AchievementsCard] ensure-achievement-definitions Edge Function fehlgeschlagen " +
          "(evtl. noch nicht deployed?). Fallback auf Direct-Write (nur für Admins).",
          e,
        );
      }

      if (!edgeFnOk) {
        try {
          const rows = REQUIRED_ACHIEVEMENT_DEFS_FALLBACK.filter((d) => missingCodes.includes(d.code));
          const { error: fallbackError } = await supabase
            .from("achievement_definitions")
            .upsert(rows, { onConflict: "code" });
          if (fallbackError) {
            console.error(
              "[AchievementsCard] Fallback-Write ebenfalls fehlgeschlagen (kein Admin? RLS?). " +
              "Achievement-Definitionen bleiben unvollständig, bis ensure-achievement-definitions deployed ist.",
              fallbackError,
            );
          }
        } catch (e) {
          console.error("[AchievementsCard] Fallback-Write Exception:", e);
        }
      }

      refetchDefs();
    };
    seedDefs();
  }, [user, defs, defsSeedAttempted, refetchDefs]);

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
                        title={`${TIER_LABELS[t.tier] || t.tier} · ab ${t.threshold}${t.reward_amount ? ` · ${formatMoney(t.reward_amount)}` : ""}`}
                      >
                        <MedalIcon className={`w-5 h-5 ${ownedTier ? "drop-shadow-glow" : ""}`} />
                        <span className="text-[10px] tabular-nums font-bold">{t.threshold}</span>
                        {t.reward_amount ? (
                          <span className="text-[9px] tabular-nums font-semibold text-foreground/70">
                            {formatMoney(t.reward_amount)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {next ? (
                  <div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs mt-1 tabular-nums font-semibold text-foreground/90">
                      {value} / {next.threshold} → nächste Medaille: {TIER_LABELS[next.tier] || next.tier}
                      {next.reward_amount ? ` (+${formatMoney(next.reward_amount)})` : ""}
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