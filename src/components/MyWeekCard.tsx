import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, TrendingDown, Minus, FileText, Car } from "lucide-react";
import { countMissionsForUser } from "@/lib/missionStats";

function getASDWeekStart() {
  const now = new Date();
  // ASD week resets Sunday 18:20 German time
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sun
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  sunday.setHours(18, 20, 0, 0);
  if (now < sunday) {
    sunday.setDate(sunday.getDate() - 7);
  }
  return sunday;
}

const MyWeekCard = () => {
  const { user, profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-week-stats", user?.id],
    queryFn: async () => {
      const weekStart = getASDWeekStart();
      const [missionsRes, pursuitsRes, resetsRes, profilesRes] = await Promise.all([
        supabase.from("missions").select("id, protokollschreiber, tatzeit, created_at"),
        supabase.from("pursuits").select("id, created_by, pursuit_date, created_at"),
        supabase.from("stats_resets").select("*").order("reset_at", { ascending: false }),
        supabase.from("profiles").select("id, is_approved"),
      ]);
      const missions = missionsRes.data || [];
      const pursuits = pursuitsRes.data || [];
      const resets = resetsRes.data || [];
      const profiles = profilesRes.data || [];

      const lastWeeklyReset = resets.find((r: any) => r.reset_type === "weekly")?.reset_at;
      const lastPursuitReset = resets.find((r: any) => r.reset_type === "pursuits")?.reset_at;
      const effectiveWeekStart = lastWeeklyReset && new Date(lastWeeklyReset) > weekStart
        ? new Date(lastWeeklyReset) : weekStart;
      const effectivePursuitStart = lastPursuitReset && new Date(lastPursuitReset) > effectiveWeekStart
        ? new Date(lastPursuitReset) : effectiveWeekStart;

      const weeklyMissions = missions.filter((m: any) => {
        const d = new Date(m.tatzeit ?? m.created_at);
        return d >= effectiveWeekStart;
      });
      const weeklyPursuits = pursuits.filter((p: any) => {
        const d = new Date(p.pursuit_date ?? p.created_at);
        return d >= effectivePursuitStart;
      });

      const myMissions = countMissionsForUser(weeklyMissions, user?.id || "");
      const myPursuits = weeklyPursuits.filter((p: any) => p.created_by === user?.id).length;
      const myTotal = myMissions + myPursuits;

      // Build counts per active user → average
      const counts: Record<string, number> = {};
      weeklyMissions.forEach((m: any) => {
        if (m.protokollschreiber) counts[m.protokollschreiber] = (counts[m.protokollschreiber] || 0) + 1;
      });
      weeklyPursuits.forEach((p: any) => {
        if (p.created_by) counts[p.created_by] = (counts[p.created_by] || 0) + 1;
      });

      const approvedIds = new Set(profiles.filter((p: any) => p.is_approved).map((p: any) => p.id));
      const activeMembers = Math.max(approvedIds.size, 1);
      const totalEntries = Object.values(counts).reduce((a, b) => a + b, 0);
      const average = totalEntries / activeMembers;

      // Ranking
      const ranking = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const myRank = ranking.findIndex(([id]) => id === user?.id) + 1;

      return { myMissions, myPursuits, myTotal, average, myRank, totalActive: ranking.length };
    },
    enabled: !!user,
  });

  if (!data) return null;

  const diff = data.myTotal - data.average;
  const diffPct = data.average > 0 ? Math.round((diff / data.average) * 100) : 0;

  let trend: { icon: any; cls: string; text: string };
  if (data.myTotal === 0) {
    trend = { icon: Minus, cls: "text-muted-foreground", text: "Noch keine Einträge diese Woche" };
  } else if (diff > 0) {
    trend = { icon: TrendingUp, cls: "text-emerald-400", text: `${diffPct > 0 ? "+" : ""}${diffPct}% über dem Schnitt` };
  } else if (diff < 0) {
    trend = { icon: TrendingDown, cls: "text-orange-400", text: `${diffPct}% unter dem Schnitt` };
  } else {
    trend = { icon: Minus, cls: "text-muted-foreground", text: "Genau im Schnitt" };
  }

  const TrendIcon = trend.icon;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-primary text-base sm:text-lg flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Deine Woche
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {profile?.name} · ASD-Woche (Sonntag 18:20 → Sonntag 18:20)
          </p>
        </div>
        {data.myRank > 0 && (
          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
            Rang {data.myRank} / {data.totalActive}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
        <div className="bg-background/60 border border-border rounded-md p-2 sm:p-3 text-center">
          <FileText className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">{data.myMissions}</p>
          <p className="text-[10px] text-muted-foreground">Einsätze</p>
        </div>
        <div className="bg-background/60 border border-border rounded-md p-2 sm:p-3 text-center">
          <Car className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">{data.myPursuits}</p>
          <p className="text-[10px] text-muted-foreground">10-80</p>
        </div>
        <div className="bg-primary/5 border border-primary/30 rounded-md p-2 sm:p-3 text-center">
          <Trophy className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-primary">{data.myTotal}</p>
          <p className="text-[10px] text-muted-foreground">Gesamt</p>
        </div>
      </div>

      <div className={`flex items-center gap-2 text-xs ${trend.cls}`}>
        <TrendIcon className="w-4 h-4" />
        <span className="font-medium">{trend.text}</span>
        <span className="text-muted-foreground ml-auto">
          Schnitt: <span className="tabular-nums">{data.average.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
};

export default MyWeekCard;
