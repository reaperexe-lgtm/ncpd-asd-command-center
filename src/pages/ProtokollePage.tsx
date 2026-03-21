import { logActivity } from "@/lib/activityLog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, FileText, Car, Users, Clock, Siren, Image } from "lucide-react";
import { useState } from "react";

const LOCATION_COLORS: Record<string, string> = {
  Staatsbank: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Juwelier: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Human Labs": "bg-lime-500/15 text-lime-400 border-lime-500/20",
  Geiselnahme: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Razzia: "bg-red-500/15 text-red-400 border-red-500/20",
  Panikbutton: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "10-12 Laden": "bg-sky-500/15 text-sky-400 border-sky-500/20",
  "1000 Laden": "bg-sky-500/15 text-sky-400 border-sky-500/20",
  "Paleto Bank": "bg-teal-500/15 text-teal-400 border-teal-500/20",
  "Sandy Laden": "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const ProtokollePage = () => {
  const { isAdmin, role } = useAuth();
  const canDelete = isAdmin || role === "supervisor";
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mission" | "pursuit">("all");

  const { data: missions, isLoading: missionsLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("*, mission_vehicles(*)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pursuits, isLoading: pursuitsLoading } = useQuery({
    queryKey: ["pursuits"],
    queryFn: async () => {
      const { data } = await supabase.from("pursuits").select("*, pursuit_photos(*)").order("pursuit_date", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, dienstnummer");
      return data || [];
    },
  });

  const deleteMission = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("mission_vehicles").delete().eq("mission_id", id);
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["missions"] }); toast.success("Protokoll gelöscht"); logActivity("Einsatz-Protokoll gelöscht", "einsatz", { mission_id: id }); },
  });

  const deletePursuit = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("pursuit_photos").delete().eq("pursuit_id", id);
      const { error } = await supabase.from("pursuits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["pursuits"] }); toast.success("Verfolgung gelöscht"); logActivity("Verfolgung gelöscht", "verfolgung", { pursuit_id: id }); },
  });

  const getProfileName = (id: string | null) => {
    if (!id) return "–";
    const p = profiles?.find((p) => p.id === id);
    return p ? `${p.name}${p.dienstnummer ? ` (${p.dienstnummer})` : ""}` : "–";
  };

  const isLoading = missionsLoading || pursuitsLoading;

  // Combine and sort by date
  type Entry = { type: "mission"; data: any; date: string } | { type: "pursuit"; data: any; date: string };
  const allEntries: Entry[] = [];
  if (filter !== "pursuit") {
    missions?.forEach((m) => allEntries.push({ type: "mission", data: m, date: m.created_at }));
  }
  if (filter !== "mission") {
    pursuits?.forEach((p) => allEntries.push({ type: "pursuit", data: p, date: p.pursuit_date }));
  }
  allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCount = (missions?.length || 0) + (pursuits?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Protokolle</h1>
            <p className="text-xs text-muted-foreground">{totalCount} gespeicherte Einträge</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[
            { key: "all" as const, label: "Alle" },
            { key: "mission" as const, label: "Einsätze" },
            { key: "pursuit" as const, label: "10-80" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade Protokolle...</div></div>
      ) : allEntries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Keine Protokolle vorhanden</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allEntries.map((entry) => {
            if (entry.type === "mission") {
              const m = entry.data;
              const expanded = expandedId === m.id;
              const vehicles = (m.mission_vehicles as any[]) || [];
              return (
                <div key={m.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/20 transition-colors">
                  <button onClick={() => setExpandedId(expanded ? null : m.id)} className="w-full px-5 py-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-3 py-1 rounded-full border font-medium ${LOCATION_COLORS[m.location_type] || "bg-secondary/50 text-secondary-foreground border-border"}`}>
                        {m.location_type}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.tatzeit).toLocaleDateString("de-DE")} · {new Date(m.tatzeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.suspects_count} TV · {m.hostages_count} Geiseln</span>
                      {vehicles.length > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" /> {vehicles.length}</span>}
                      {m.gang_info && <span className="text-xs px-2.5 py-1 rounded-full border font-semibold bg-red-500/15 text-red-400 border-red-500/30 flex items-center gap-1"><Siren className="w-3 h-3" />{m.gang_info}</span>}
                    </div>
                    <svg className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {m.description && <p className="text-sm leading-relaxed">{m.description}</p>}
                      <div className="flex gap-6">
                        <div className="text-center"><p className="text-2xl font-bold text-primary tabular-nums">{m.suspects_count}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tatverdächtige</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-primary tabular-nums">{m.hostages_count}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Geiseln</p></div>
                      </div>
                      {m.gang_info && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Banden-Info</p><p className="text-sm">{m.gang_info}</p></div>}
                      <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Protokollschreiber</p><p className="text-sm text-primary">{getProfileName(m.protokollschreiber)}</p></div>
                      {vehicles.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Car className="w-3 h-3" /> Fahrzeuge ({vehicles.length})</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {vehicles.map((v: any) => (
                              <div key={v.id} className="bg-background border border-border rounded-md p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{v.vehicle_type} – {v.model}</p>
                                  {v.license_plate && <span className="text-sm font-bold font-mono bg-yellow-400/20 text-yellow-300 px-3 py-1 rounded border-2 border-yellow-400/50 tracking-widest shadow-[0_0_8px_rgba(250,204,21,0.15)]">{v.license_plate}</span>}
                                </div>
                                {v.owner_info && <p className="text-xs text-muted-foreground">Besitzer: {v.owner_info}</p>}
                                <div className="flex items-center gap-2">
                                  {[{ label: "P", color: v.primary_color }, { label: "S", color: v.secondary_color }, { label: "Pearl", color: v.pearl_color }, { label: "Neon", color: v.neon_color }].map((c) => c.color && c.color !== "#000000" ? (
                                    <div key={c.label} className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-border" style={{ background: c.color }} /><span className="text-[10px] text-muted-foreground">{c.label}</span></div>
                                  ) : null)}
                                  {v.xenon && <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">Xenon</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Besatzung</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {[{ label: "Pilot", value: m.pilot }, { label: "Co-Pilot", value: m.co_pilot }, { label: "Left Gunner", value: m.left_gunner }, { label: "Right Gunner", value: m.right_gunner }].map(({ label, value }) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs w-24">{label}:</span>
                              <span className={value && value !== "none" ? "text-primary" : "text-muted-foreground"}>{value && value !== "none" ? value : "–"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {canDelete && (
                        <div className="flex justify-end pt-2">
                          <Button size="sm" variant="destructive" onClick={() => deleteMission.mutate(m.id)} className="gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Löschen</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            } else {
              // Pursuit entry
              const p = entry.data;
              const expanded = expandedId === `p-${p.id}`;
              const pPhotos = (p.pursuit_photos as any[]) || [];
              return (
                <div key={`p-${p.id}`} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/20 transition-colors">
                  <button onClick={() => setExpandedId(expanded ? null : `p-${p.id}`)} className="w-full px-5 py-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs px-3 py-1 rounded-full border font-medium bg-primary/10 text-primary border-primary/20">10-80</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.pursuit_date).toLocaleDateString("de-DE")} · {new Date(p.pursuit_date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {p.vehicle_model && <span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" /> {p.vehicle_model}</span>}
                      {p.license_plate && <span className="text-sm font-bold font-mono bg-yellow-400/20 text-yellow-300 px-3 py-1 rounded border-2 border-yellow-400/50 tracking-widest shadow-[0_0_8px_rgba(250,204,21,0.15)]">{p.license_plate}</span>}
                      {pPhotos.length > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Image className="w-3 h-3" /> {pPhotos.length}</span>}
                    </div>
                    <svg className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {p.description && <p className="text-sm leading-relaxed">{p.description}</p>}
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fahrzeug</p><p className="text-sm text-primary mt-0.5">{p.vehicle_model || "–"}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kennzeichen</p><p className="text-base font-bold font-mono text-yellow-300 mt-0.5 tracking-widest">{p.license_plate || "–"}</p></div>
                      </div>
                      {pPhotos.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Image className="w-3 h-3" /> Fotos ({pPhotos.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {pPhotos.map((ph: any) => (<img key={ph.id} src={ph.image_url} alt="Foto" className="rounded-md border border-border object-cover w-full h-32" />))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Besatzung</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {[{ label: "Pilot", value: p.pilot }, { label: "Co-Pilot", value: p.co_pilot }, { label: "Left Gunner", value: p.left_gunner }, { label: "Right Gunner", value: p.right_gunner }].map(({ label, value }) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs w-24">{label}:</span>
                              <span className={value && value !== "none" ? "text-primary" : "text-muted-foreground"}>{value && value !== "none" ? value : "–"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {canDelete && (
                        <div className="flex justify-end pt-2">
                          <Button size="sm" variant="destructive" onClick={() => deletePursuit.mutate(p.id)} className="gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Löschen</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

export default ProtokollePage;
