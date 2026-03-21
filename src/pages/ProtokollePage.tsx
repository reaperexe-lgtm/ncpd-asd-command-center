import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProtokollePage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: missions, isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("*, mission_vehicles(*)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const deleteMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions"] }); toast.success("Protokoll gelöscht"); },
  });

  const LOCATION_COLORS: Record<string, string> = {
    Staatsbank: "bg-green-700", Juwelier: "bg-purple-700", "Human Labs": "bg-lime-700",
    Geiselnahme: "bg-orange-700", Razzia: "bg-red-700", Panikbutton: "bg-yellow-700",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Gespeicherte Protokolle</h1>
      {isLoading ? <p className="text-muted-foreground">Lade...</p> : (
        <div className="space-y-6">
          {missions?.length === 0 && <p className="text-muted-foreground">Keine Protokolle vorhanden.</p>}
          {missions?.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded text-white ${LOCATION_COLORS[m.location_type] || "bg-secondary"}`}>
                    {m.location_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — {new Date(m.tatzeit).toLocaleDateString("de-DE")}, {new Date(m.tatzeit).toLocaleTimeString("de-DE")}
                  </span>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="destructive" onClick={() => deleteMission.mutate(m.id)}>Löschen</Button>
                )}
              </div>

              {m.description && <p className="text-sm">{m.description}</p>}

              <div className="flex gap-3 flex-wrap">
                <div className="bg-primary/10 border border-primary/30 rounded px-3 py-1 text-center">
                  <p className="text-lg font-bold text-primary">{m.suspects_count}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Tatverdächtige</p>
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded px-3 py-1 text-center">
                  <p className="text-lg font-bold text-primary">{m.hostages_count}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Geiseln</p>
                </div>
              </div>

              {/* Vehicles */}
              {(m.mission_vehicles as any[])?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(m.mission_vehicles as any[]).map((v: any) => (
                    <div key={v.id} className="text-xs border border-border/50 rounded p-2">
                      <p className="font-semibold">{v.vehicle_type} {v.model}</p>
                      {v.license_plate && <p className="mt-1 px-2 py-0.5 border border-border inline-block rounded font-mono">{v.license_plate}</p>}
                      <p className="text-muted-foreground mt-1">Besitzer: {v.owner_info || "–"}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span>Primär: <span className="inline-block w-3 h-3 rounded" style={{ background: v.primary_color }} /></span>
                        <span>Sekundär: <span className="inline-block w-3 h-3 rounded" style={{ background: v.secondary_color }} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Besatzung */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="text-primary uppercase tracking-wider text-[10px] font-semibold">Besatzung</p>
                <div className="grid grid-cols-2 gap-2">
                  <p>🎯 Pilot: {m.pilot || "–"}</p>
                  <p>🎯 Co-Pilot: {m.co_pilot || "–"}</p>
                  <p>➡️ Left Gunner: {m.left_gunner || "–"}</p>
                  <p>➡️ Right Gunner: {m.right_gunner || "–"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProtokollePage;
