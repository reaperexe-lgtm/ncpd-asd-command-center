import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLog";
import { BarChart3, TrendingUp, Calendar, Trophy, FileText, RotateCw, Car, X, ChevronRight, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  // ASD week: Sunday 18:20 CET/CEST to next Sunday 18:20 CET/CEST
  // We work in German time (Europe/Berlin)
  const now = new Date();
  
  // Get current time in German timezone
  const germanNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const day = germanNow.getDay();
  const h = germanNow.getHours();
  const m = germanNow.getMinutes();
  
  // Find the most recent Sunday 18:20 German time
  const start = new Date(germanNow);
  start.setHours(18, 20, 0, 0);
  if (day === 0 && (h > 18 || (h === 18 && m >= 20))) {
    // start is today (Sunday after 18:20)
  } else {
    const daysBack = day === 0 ? 7 : day;
    start.setDate(start.getDate() - daysBack);
  }
  
  // End is next Sunday 18:20
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  // end already has 18:20 from start
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

const RESET_TYPE_LABELS: Record<string, string> = {
  weekly: "Wochenstatistik",
  monthly: "Monatsstatistik",
  pursuits: "10-80 Verfolgungen",
  overview: "Übersicht",
  all: "Alle Statistiken",
};

function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!targetDate) { setTimeLeft(""); return; }
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Jetzt"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}T ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

const StatistikPage = () => {
  const { isAdmin, role, user } = useAuth();
  const canReset = ["director", "co_director", "supervisor"].includes(role || "");
  const canResetDirect = isAdmin;
  const queryClient = useQueryClient();
  const [selectedWriter, setSelectedWriter] = useState<{ id: string; name: string } | null>(null);
  const [resetDialog, setResetDialog] = useState<string | null>(null);
  const [resetReason, setResetReason] = useState("");

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

  // Direct reset (admin only)
  const resetMutation = useMutation({
    mutationFn: async (resetType: string) => {
      if (resetType === "all") {
        const now = new Date().toISOString();
        const { error } = await supabase.from("stats_resets").insert([
          { reset_type: "weekly", reset_by: user?.id, reset_at: now },
          { reset_type: "monthly", reset_by: user?.id, reset_at: now },
          { reset_type: "pursuits", reset_by: user?.id, reset_at: now },
          { reset_type: "overview", reset_by: user?.id, reset_at: now },
        ] as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stats_resets").insert({ reset_type: resetType, reset_by: user?.id } as any);
        if (error) throw error;
      }
      logActivity(`Statistik resettet: ${RESET_TYPE_LABELS[resetType] || resetType}`, "admin", { reset_type: resetType });
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ["stats-resets"] });
      toast.success(RESET_TYPE_LABELS[type] ? `${RESET_TYPE_LABELS[type]} zurückgesetzt` : "Statistik zurückgesetzt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Request reset (non-admin)
  const requestResetMutation = useMutation({
    mutationFn: async ({ resetType, reason }: { resetType: string; reason: string }) => {
      const { error } = await supabase.from("reset_requests").insert({
        reset_type: resetType,
        reason,
        requested_by: user?.id,
      } as any);
      if (error) throw error;
      logActivity(`Reset-Anfrage gestellt: ${RESET_TYPE_LABELS[resetType] || resetType}`, "admin", { reset_type: resetType, reason });
    },
    onSuccess: () => {
      toast.success("Reset-Anfrage wurde an den Admin gesendet");
      setResetDialog(null);
      setResetReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleReset = (type: string) => {
    if (canResetDirect) {
      resetMutation.mutate(type);
    } else if (canReset) {
      setResetDialog(type);
    } else {
      toast.error("Du bist nicht befugt, die Statistik zurückzusetzen.");
    }
  };

  const profileName = (id: string) => profiles?.find((p) => p.id === id)?.name || "Unbekannt";

  const lastWeeklyResetEntry = resets?.find((r: any) => r.reset_type === "weekly");
  const lastMonthlyResetEntry = resets?.find((r: any) => r.reset_type === "monthly");
  const lastPursuitResetEntry = resets?.find((r: any) => r.reset_type === "pursuits");
  const lastOverviewResetEntry = resets?.find((r: any) => r.reset_type === "overview");
  const lastWeeklyReset = lastWeeklyResetEntry?.reset_at;
  const lastMonthlyReset = lastMonthlyResetEntry?.reset_at;
  const lastPursuitReset = lastPursuitResetEntry?.reset_at;
  const lastOverviewReset = lastOverviewResetEntry?.reset_at;

  // Compute next auto-reset dates
  const { end: weekEnd } = getASDWeekRange();
  const { end: monthEnd } = getMonthRange();
  const weeklyCountdown = useCountdown(weekEnd);
  const monthlyCountdown = useCountdown(monthEnd);

  const formatResetInfo = (entry: any, nextDate?: Date, nextCountdown?: string) => {
    const parts: string[] = [];
    if (entry) {
      const date = new Date(entry.reset_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const isAuto = !entry.reset_by;
      const name = isAuto ? "Automatisch" : profileName(entry.reset_by);
      parts.push(`Letzter Reset: ${date} – ${isAuto ? "⚙️ Automatisch" : `👤 ${name}`}`);
    }
    if (nextDate && nextCountdown) {
      const nextDateStr = nextDate.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      parts.push(`Nächster Reset: ${nextDateStr} (⏱️ ${nextCountdown})`);
    }
    return parts;
  };

  // --- Weekly leaderboard ---
  const { start: weekStart } = getASDWeekRange();
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
  const { start: monthStart } = getMonthRange();
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
  const overviewCutoff = lastOverviewReset ? new Date(lastOverviewReset) : null;
  const filteredMissions = overviewCutoff
    ? missions?.filter((m) => new Date(m.created_at) >= overviewCutoff) || []
    : missions || [];

  const effectivePursuitStart = lastPursuitReset ? new Date(lastPursuitReset) : null;
  const filteredPursuits = effectivePursuitStart
    ? pursuits?.filter((p) => new Date(p.created_at) >= effectivePursuitStart) || []
    : pursuits || [];

  const locationCounts: Record<string, number> = {};
  filteredMissions.forEach((m) => { locationCounts[m.location_type] = (locationCounts[m.location_type] || 0) + 1; });
  const pursuitCount = filteredPursuits.length;
  if (pursuitCount > 0) locationCounts["10-80 Verfolgung"] = pursuitCount;
  const total = filteredMissions.length + pursuitCount;
  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  const donutData = sortedLocations.map(([name, value]) => ({ name, value }));

  const totalSuspects = filteredMissions.reduce((s, m) => s + m.suspects_count, 0);
  const totalHostages = filteredMissions.reduce((s, m) => s + m.hostages_count, 0);

  const monthly: Record<string, number> = {};
  filteredMissions.forEach((m) => {
    const key = new Date(m.tatzeit).toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    monthly[key] = (monthly[key] || 0) + 1;
  });
  const monthlyEntries = Object.entries(monthly).slice(-6);
  const maxMonthly = Math.max(...monthlyEntries.map(([, v]) => v), 1);

  // --- 10-80 Pursuit Stats ---
  const pursuitCreatorCounts: Record<string, number> = {};
  filteredPursuits.forEach((p) => {
    pursuitCreatorCounts[p.created_by] = (pursuitCreatorCounts[p.created_by] || 0) + 1;
  });
  const pursuitRanking = Object.entries(pursuitCreatorCounts).sort((a, b) => b[1] - a[1]);
  const maxPursuit = pursuitRanking[0]?.[1] || 1;

  // Protocols for selected writer - only current week
  const writerProtocols = selectedWriter
    ? weeklyMissions.filter((m) => m.protokollschreiber === selectedWriter.id)
    : [];

  const ResetInfoBlock = ({ entries, className = "" }: { entries: string[], className?: string }) => (
    entries.length > 0 ? (
      <div className={`space-y-0.5 ${className}`}>
        {entries.map((e, i) => (
          <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
            {i === 1 && <Clock className="w-3 h-3 text-primary shrink-0" />}
            {e}
          </p>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">Statistik</h1>
          <p className="text-xs text-muted-foreground">Übersicht aller Einsätze</p>
        </div>
        {(canReset || canResetDirect) && (
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleReset("all")}>
            <RotateCw className="w-4 h-4" /> Alles zurücksetzen
          </Button>
        )}
      </div>

      {/* Weekly Protokollschreiber */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top-Protokollschreiber (aktuelle ASD-Woche)
          </h2>
          <div className="flex items-center gap-2">
            {(canReset || canResetDirect) && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => handleReset("weekly")}>
                <RotateCw className="w-3 h-3" /> Reset
              </Button>
            )}
            <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">Protokolle</span>
          </div>
        </div>
        <ResetInfoBlock entries={formatResetInfo(lastWeeklyResetEntry, weekEnd, weeklyCountdown)} className="mb-3" />
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
          {(canReset || canResetDirect) && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => handleReset("monthly")}>
              <RotateCw className="w-3 h-3" /> Reset
            </Button>
          )}
        </div>
        <ResetInfoBlock entries={formatResetInfo(lastMonthlyResetEntry, monthEnd, monthlyCountdown)} className="mb-4" />
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

      {/* 10-80 Verfolgungen */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <Car className="w-5 h-5" />
            10-80 Verfolgungen
          </h2>
          <div className="flex items-center gap-2">
            {(canReset || canResetDirect) && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => handleReset("pursuits")}>
                <RotateCw className="w-3 h-3" /> Reset
              </Button>
            )}
            <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              Gesamt: {pursuitCount}
            </span>
          </div>
        </div>
        <ResetInfoBlock entries={formatResetInfo(lastPursuitResetEntry)} className="mb-3" />
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
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Übersicht
          </h2>
          {(canReset || canResetDirect) && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => handleReset("overview")}>
              <RotateCw className="w-3 h-3" /> Reset
            </Button>
          )}
        </div>
        <ResetInfoBlock entries={formatResetInfo(lastOverviewResetEntry)} className="mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Einsätze", value: total, icon: BarChart3 },
            { label: "Tatverdächtige", value: totalSuspects, icon: TrendingUp },
            { label: "Geiseln", value: totalHostages, icon: TrendingUp },
            { label: "Raubarten", value: sortedLocations.length, icon: Calendar },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-secondary/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
              <p className="text-3xl font-bold text-primary tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Donut chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-primary">Einsätze nach Raubart</h2>
          {(canReset || canResetDirect) && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => handleReset("overview")}>
              <RotateCw className="w-3 h-3" /> Reset
            </Button>
          )}
        </div>
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

      {/* Dialog: Protokolle eines Schreibers (nur aktuelle Woche) */}
      <Dialog open={!!selectedWriter} onOpenChange={(open) => !open && setSelectedWriter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Protokolle von {selectedWriter?.name} (aktuelle Woche)
            </DialogTitle>
          </DialogHeader>
          {writerProtocols.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Protokolle diese Woche</p>
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
                {writerProtocols.length} Protokoll{writerProtocols.length !== 1 ? "e" : ""} diese Woche
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Request Dialog (for non-admin) */}
      <Dialog open={!!resetDialog} onOpenChange={(open) => !open && setResetDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Reset-Anfrage: {RESET_TYPE_LABELS[resetDialog || ""] || resetDialog}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bitte gib einen Grund für den Reset an. Ein Admin muss die Anfrage genehmigen.
            </p>
            <Textarea 
              placeholder="Grund für den Reset..."
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              className="bg-background border-border"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetDialog(null)}>Abbrechen</Button>
              <Button 
                onClick={() => resetDialog && requestResetMutation.mutate({ resetType: resetDialog, reason: resetReason })}
                disabled={!resetReason.trim() || requestResetMutation.isPending}
              >
                Anfrage senden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatistikPage;