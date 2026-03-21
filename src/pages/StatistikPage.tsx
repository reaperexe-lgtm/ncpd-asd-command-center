import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";

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
};

const StatistikPage = () => {
  const { data: missions } = useQuery({
    queryKey: ["missions-stats"],
    queryFn: async () => { const { data } = await supabase.from("missions").select("*"); return data || []; },
  });

  const locationCounts: Record<string, number> = {};
  missions?.forEach((m) => { locationCounts[m.location_type] = (locationCounts[m.location_type] || 0) + 1; });
  const total = missions?.length || 0;
  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedLocations[0]?.[1] || 1;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Statistik</h1>
          <p className="text-xs text-muted-foreground">Übersicht aller Einsätze</p>
        </div>
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

      {/* Bar chart – by location */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-primary mb-5">Einsätze nach Raubart</h2>
        {sortedLocations.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Noch keine Einsätze vorhanden</p>
        ) : (
          <div className="space-y-3">
            {sortedLocations.map(([loc, count]) => (
              <div key={loc} className="group">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{loc}</span>
                  <span className="text-muted-foreground tabular-nums">{count} <span className="text-xs">({((count / total) * 100).toFixed(0)}%)</span></span>
                </div>
                <div className="h-6 bg-background rounded-md overflow-hidden border border-border/50">
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                    style={{
                      width: `${Math.max((count / maxCount) * 100, 8)}%`,
                      background: LOCATION_COLORS[loc] || "hsl(var(--primary))",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white drop-shadow-sm">{count}</span>
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
};

export default StatistikPage;
