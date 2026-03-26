import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, Calendar, Trophy, FileText, RotateCw, Car, X, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const LOCATION_COLORS: Record<string, string> = {
  Staatsbank: "hsl(160, 60%, 45%)",
  Juwelier: "hsl(270, 60%, 55%)",
  "Human Labs": "hsl(85, 60%, 45%)",
  Geiselnahme: "hsl(30, 80%, 55%)",
  Razzia: "hsl(0, 65%, 50%)",
  Panikbutton: "hsl(45, 80%, 55%)",
  "10-12 Laden": "hsl(200, 60%, 55%)",
  "1000 Laden": "hsl(195, 60%, 50%)",
  "Paleto Bank": "hsl(175, 55%, 45%)",
  "Sandy Laden": "hsl(35, 70%, 55%)",
  "Shots Fired": "hsl(120, 50%, 45%)",
  "Mirror Park Tanke": "hsl(310, 50%, 50%)",
  "Laden Davis": "hsl(50, 60%, 45%)",
};

const PIE_COLORS = [
  "hsl(160, 60%, 45%)", "hsl(40, 80%, 55%)", "hsl(270, 60%, 55%)", "hsl(30, 80%, 55%)",
  "hsl(0, 65%, 50%)", "hsl(85, 60%, 45%)", "hsl(200, 60%, 55%)", "hsl(175, 55%, 45%)",
  "hsl(45, 80%, 55%)", "hsl(310, 50%, 50%)", "hsl(120, 50%, 45%)", "hsl(50, 60%, 45%)",
];

function getASDWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const h = now.getHours();
  const m = now.getMinutes();
  const start = new Date(now);
  start.setHours(18, 30, 0, 0);
  if (day === 0 && (h > 18 || (h === 18 && m >= 30))) {
    // start is today
  } else {
    const daysBack = day === 0 ? 7 : day;
    start.setDate(start.getDate() - daysBack);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(17, 55, 0, 0);
  return { start, end };
}

function getMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

const MEDAL = ["🥇", "🥈", "🥉"];
const BAR_COLORS = [
  "hsl(45, 90%, 55%)", "hsl(210, 50%, 60%)", "hsl(25, 60%, 50%)",
  "hsl(160, 50%, 40%)", "hsl(270, 40%, 50%)", "hsl(0, 50%, 50%)",
  "hsl(200, 45%, 50%)", "hsl(30, 55%, 45%)", "hsl(85, 45%, 45%)",
  "hsl(175, 40%, 45%)", "hsl(310, 40%, 45%)", "hsl(50, 50%, 45%)",
];

const StatistikPage = () => {
  const { isAdmin, role, user } = useAuth();
  const canReset = isAdmin || ["director", "co_director", "ausbilder"].includes(role || "");
  const queryClient = useQueryClient();
  const [selectedWriter, setSelectedWriter] = useState<{ id: string; name: string } | null>(null);

  const { data: missions } = useQuery({
    queryKey: ["missions-stats"],
    queryFn: async () => { const { data } = await supabase.from("missions").select("*"); return data || []; },
  });

  const { data: pursuits } = useQuery({
    queryKey: ["pursuits-stats"],
    queryFn: async () => { const { data } = await supabase.from("pursuits").select("*"); return data || []; },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("id, name"); return data || []; },
  });

  const { data: resets } = useQuery({
    queryKey: ["stats-resets"],
    queryFn: async () => {
      const { data } = await supabase.from("stats_resets").select("*").order("reset_at", { ascending: false });
      return data || [];
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (resetType: string) => {
      const { error } = await supabase.from("stats_resets").insert({ reset_type: resetType, reset_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ["stats-resets"] });
      toast.success(type === "weekly" ? "Wochenstatistik zurückgesetzt" : "Monatsstatistik zurückgesetzt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const profileName = (id: string) => profiles?.find((p) => p.id === id)?.name || "Unbekannt";

  const lastWeeklyResetEntry = resets?.find((r: any) => r.reset_type === "weekly");
  const lastMonthlyResetEntry = resets?.find((r: any) => r.reset_type === "monthly");
  const lastWeeklyReset = lastWeeklyResetEntry?.reset_at;
  const lastMonthlyReset = lastMonthlyResetEntry?.reset_at;

  const formatResetInfo = (entry: any) => {
    if (!entry) return null;
    const date = new Date(entry.reset_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const name = entry.reset_by ? profileName(entry.reset_by) : "Unbekannt";
    return `Letzter Reset: ${date} von ${name}`;
  };

  // --- Weekly leaderboard ---
  const { start: weekStart, end: weekEnd } = getASDWeekRange();
  const effectiveWeekStart = lastWeeklyReset && new Date(lastWeeklyReset) > weekStart ? new Date(lastWeeklyReset) : weekStart;
  const weeklyMissions = missions?.filter((m) => {
    const d = new Date(m.created_at);
    return d >= effectiveWeekStart && d < weekEnd;
  }) || [];

  const weeklyCounts: Record<string, number> = {};
  weeklyMissions.forEach((m) => {
    if (m.protokollschreiber) weeklyCounts[m.protokollschreiber] = (weeklyCounts[m.protokollschreiber] || 0) + 1;
  });
  const weeklyRanking = Object.entries(weeklyCounts).sort((a, b) => b[1] - a[1]);

  // --- Monthly leaderboard ---
  const { start: monthStart, end: monthEnd } = getMonthRange();
  const effectiveMonthStart = lastMonthlyReset && new Date(lastMonthlyReset) > monthStart ? new Date(lastMonthlyReset) : monthStart;
  const monthlyMissions = missions?.filter((m) => {
    const d = new Date(m.created_at);
    return d >= effectiveMonthStart && d < monthEnd;
  }) || [];
  const allTimeCounts: Record<string, number> = {};
  monthlyMissions.forEach((m) => {
    if (m.protokollschreiber) allTimeCounts[m.protokollschreiber] = (allTimeCounts[m.protokollschreiber] || 0) + 1;
  });
  const allTimeRanking = Object.entries(allTimeCounts).sort((a, b) => b[1] - a[1]);
  const maxAllTime = allTimeRanking[0]?.[1] || 1;

  // --- Location stats ---
  const locationCounts: Record<string, number> = {};
  missions?.forEach((m) => { locationCounts[m.location_type] = (locationCounts[m.location_type] || 0) + 1; });
  const pursuitCount = pursuits?.length || 0;
  if (pursuitCount > 0) locationCounts["10-80 Verfolgung"] = pursuitCount;
  const total = (missions?.length || 0) + pursuitCount;
  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  const donutData = sortedLocations.map(([name, value]) => ({ name, value }));

  const totalSuspects = missions?.reduce((s, m) => s + m.suspects_count, 0) || 0;
  const totalHostages = missions?.reduce((s, m) => s + m.hostages_count, 0) || 0;

  // Monthly breakdown
  const monthly: Record<string, number> = {};
  missions?.forEach((m) => {
    const key = new Date(m.tatzeit).toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    monthly[key] = (monthly[key] || 0) + 1;
  });
  const monthlyEntries = Object.entries(monthly).slice(-6);
  const maxMonthly = Math.max(...monthlyEntries.map(([, v]) => v), 1);

  // --- 10-80 Pursuit Stats ---
  const pursuitCreatorCounts: Record<string, number> = {};
  pursuits?.forEach((p) => {
    pursuitCreatorCounts[p.created_by] = (pursuitCreatorCounts[p.created_by] || 0) + 1;
  });
  const pursuitRanking = Object.entries(pursuitCreatorCounts).sort((a, b) => b[1] - a[1]);
  const maxPursuit = pursuitRanking[0]?.[1] || 1;

  // Protocols for selected writer
  const writerProtocols = selectedWriter
    ? missions?.filter((m) => m.protokollschreiber === selectedWriter.id) || []
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Statistik</h1>
          <p className="text-xs text-muted-foreground">Übersicht aller Einsätze</p>
        </div>
      </div>

      {/* Weekly Protokollschreiber */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top-Protokollschreiber (aktuelle ASD-Woche)
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => {
              if (!canReset) { toast.error("Du bist nicht befugt, die Statistik zurückzusetzen."); return; }
              resetMutation.mutate("weekly");
            }}>
              <RotateCw className="w-3 h-3" /> Reset
            </Button>
            <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">Protokolle</span>
          </div>
        </div>
        {formatResetInfo(lastWeeklyResetEntry) && (
          <p className="text-[10px] text-muted-foreground mb-3">{formatResetInfo(lastWeeklyResetEntry)}</p>
        )}
        {weeklyRanking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Noch keine Protokolle diese Woche</p>
        ) : (
          <div className="space-y-2">
            {weeklyRanking.map(([id, count], i) => (
              <div key={id} className="flex items-center justify-between py-1.5 group">
                <button
                  className="flex items-center gap-2 hover:underline text-left"
                  onClick={() => setSelectedWriter({ id, name: profileName(id) })}
                >
                  <span className="text-base">{MEDAL[i] || ""}</span>
                  <span className="text-sm font-medium text-primary group-hover:text-accent-foreground transition-colors">{profileName(id)}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <span className="text-sm font-bold text-primary tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Protokollschreiber */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Top-Protokollschreiber – Gesamt (Monat)
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => {
            if (!canReset) { toast.error("Du bist nicht befugt, die Statistik zurückzusetzen."); return; }
            resetMutation.mutate("monthly");
          }}>
            <RotateCw className="w-3 h-3" /> Reset
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-1">Reset am 1. des Monats</p>
        {formatResetInfo(lastMonthlyResetEntry) && (
          <p className="text-[10px] text-muted-foreground mb-4">{formatResetInfo(lastMonthlyResetEntry)}</p>
        )}
        {allTimeRanking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Noch keine Protokolle</p>
        ) : (
          <div className="space-y-3">
            {allTimeRanking.map(([id, count], i) => (
              <div key={id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base w-6 text-center shrink-0">{MEDAL[i] || ""}</span>
                  <button
                    className="h-9 rounded-md flex items-center px-3 transition-all duration-500 cursor-pointer hover:brightness-110 min-w-0"
                    style={{
                      width: `${Math.max((count / maxAllTime) * 100, 20)}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                    onClick={() => setSelectedWriter({ id, name: profileName(id) })}
                  >
                    <span className="text-xs font-bold text-white truncate drop-shadow-md">{profileName(id)}</span>
                  </button>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums ml-4 shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10-80 Verfolgungen Statistik */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <Car className="w-5 h-5" />
            10-80 Verfolgungen
          </h2>
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
            Gesamt: {pursuitCount}
          </span>
        </div>
        {pursuitRanking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Noch keine 10-80 Verfolgungen</p>
        ) : (
          <div className="space-y-3">
            {pursuitRanking.map(([id, count], i) => (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base w-6 text-center shrink-0">{MEDAL[i] || ""}</span>
                  <div
                    className="h-9 rounded-md flex items-center px-3 transition-all duration-500"
                    style={{
                      width: `${Math.max((count / maxPursuit) * 100, 20)}%`,
                      backgroundColor: `hsl(0, 65%, ${50 + i * 5}%)`,
                    }}
                  >
                    <span className="text-xs font-bold text-white truncate drop-shadow-md">{profileName(id)}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums ml-4 shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Einsätze", value: total, icon: BarChart3 },
          { label: "Tatverdächtige", value: totalSuspects, icon: TrendingUp },
          { label: "Geiseln", value: totalHostages, icon: TrendingUp },
          { label: "Raubarten", value: sortedLocations.length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-bold text-primary tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Donut chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-primary mb-5">Einsätze nach Raubart</h2>
        {donutData.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Noch keine Einsätze vorhanden</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-80 h-80 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ cx, cy, midAngle, outerRadius: or, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = or + 22;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={LOCATION_COLORS[donutData[i].name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, _name, props) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {sortedLocations.map(([loc, count], i) => (
                <div key={loc} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LOCATION_COLORS[loc] || PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span>{loc}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">{count} · {((count / total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly mini chart */}
      {monthlyEntries.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-semibold text-primary mb-5">Monatliche Entwicklung</h2>
          <div className="flex items-end gap-2 h-32">
            {monthlyEntries.map(([month, count]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-primary font-bold tabular-nums">{count}</span>
                <div className="w-full rounded-t-md bg-primary/80 transition-all duration-500" style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: 4 }} />
                <span className="text-[9px] text-muted-foreground">{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: Protokolle eines Schreibers */}
      <Dialog open={!!selectedWriter} onOpenChange={(open) => !open && setSelectedWriter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Protokolle von {selectedWriter?.name}
            </DialogTitle>
          </DialogHeader>
          {writerProtocols.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Protokolle gefunden</p>
          ) : (
            <div className="space-y-2 mt-2">
              {writerProtocols
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((m) => (
                  <div key={m.id} className="bg-secondary/50 border border-border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-md shrink-0">
                        {m.location_type}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {new Date(m.tatzeit).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          {" · "}
                          {new Date(m.tatzeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.suspects_count} TV · {m.hostages_count} Geiseln
                          {m.gang_info ? ` · ${m.gang_info}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                {writerProtocols.length} Protokoll{writerProtocols.length !== 1 ? "e" : ""} gesamt
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatistikPage;
