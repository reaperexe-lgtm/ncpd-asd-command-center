import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const StatistikPage = () => {
  const { data: missions } = useQuery({
    queryKey: ["missions-stats"],
    queryFn: async () => { const { data } = await supabase.from("missions").select("*"); return data || []; },
  });

  const locationCounts: Record<string, number> = {};
  missions?.forEach((m) => {
    locationCounts[m.location_type] = (locationCounts[m.location_type] || 0) + 1;
  });
  const total = missions?.length || 0;
  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Statistik</h1>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-bold text-primary mb-4">Einsätze nach Raubart</h2>
        {sortedLocations.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Einsätze vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {sortedLocations.map(([loc, count]) => (
              <div key={loc} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{loc}</span>
                    <span className="text-primary">{count} – {((count / total) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-bold text-primary mb-2">Gesamt</h2>
        <p className="text-3xl font-bold text-primary tabular-nums">{total}</p>
        <p className="text-xs text-muted-foreground">Einsätze insgesamt</p>
      </div>
    </div>
  );
};

export default StatistikPage;
