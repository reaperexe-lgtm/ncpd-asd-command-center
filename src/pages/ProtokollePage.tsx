import { logActivity } from "@/lib/activityLog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, FileText, Car, Users, Clock, Siren, Image, ChevronDown, Shield, Crosshair } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const LOCATION_COLORS: Record<string, string> = {
  Staatsbank: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Juwelier: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Human Labs": "bg-lime-500/20 text-lime-300 border-lime-500/30",
  Geiselnahme: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Razzia: "bg-red-500/20 text-red-300 border-red-500/30",
  Panikbutton: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "10-12 Laden": "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "1000 Laden": "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "Paleto Bank": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Sandy Laden": "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const ProtokollePage = () => {
  const { isAdmin, role } = useAuth();
  const canDelete = isAdmin || role === "supervisor";
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mission" | "pursuit">("all");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data: missions, isLoading: missionsLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("*, mission_vehicles(*), gangs(name, category, image_url)").order("created_at", { ascending: false });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Protokolle</h1>
            <p className="text-xs text-muted-foreground">{totalCount} gespeicherte Einträge</p>
          </div>
        </div>
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
          {[
            { key: "all" as const, label: "Alle" },
            { key: "mission" as const, label: "Einsätze" },
            { key: "pursuit" as const, label: "10-80" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all duration-200 ${
                filter === key
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Lade Protokolle...</p>
          </div>
        </div>
      ) : allEntries.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
            <FileText className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-lg font-medium">Keine Protokolle vorhanden</p>
          <p className="text-sm mt-1 opacity-60">Erstelle einen neuen Einsatz oder eine Verfolgung</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allEntries.map((entry) => {
            if (entry.type === "mission") {
              const m = entry.data;
              const expanded = expandedId === m.id;
              const vehicles = (m.mission_vehicles as any[]) || [];
              return (
                <div
                  key={m.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 ${
                    expanded ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border hover:border-primary/20"
                  }`}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : m.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-3.5 py-1.5 rounded-lg border font-bold tracking-wide ${LOCATION_COLORS[m.location_type] || "bg-secondary/50 text-secondary-foreground border-border"}`}>
                        {m.location_type}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(m.tatzeit).toLocaleDateString("de-DE")} · {new Date(m.tatzeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{m.suspects_count} TV · {m.hostages_count} Geiseln</span>
                      {vehicles.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" /> {vehicles.length}
                        </span>
                      )}
                      {(m.gangs as any)?.name && (
                        <span className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-purple-500/15 text-purple-300 border-purple-500/30 flex items-center gap-1.5">
                          <Siren className="w-3.5 h-3.5" />{(m.gangs as any).name}
                        </span>
                      )}
                      {m.gang_info && (
                        <span className="text-xs px-2.5 py-1 rounded-lg border bg-red-500/10 text-red-400 border-red-500/20">{m.gang_info}</span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {/* Expanded content */}
                  {expanded && (
                    <div className="px-6 pb-6 space-y-5 border-t border-border/40 pt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Protokollschreiber */}
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-10 rounded-full bg-primary/40" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Protokollschreiber</p>
                          <p className="text-sm font-medium text-primary">{getProfileName(m.protokollschreiber)}</p>
                        </div>
                      </div>

                      {/* Location type label */}
                      <p className="text-base font-semibold text-foreground/80">{m.location_type}</p>

                      {/* Gang info */}
                      {((m.gangs as any)?.name || m.gang_info) && (
                        <div className="inline-flex items-stretch rounded-xl overflow-hidden border-2 border-purple-500/30 shadow-lg shadow-purple-500/5">
                          {(m.gangs as any)?.image_url ? (
                            <div
                              className="w-20 h-20 flex-shrink-0 cursor-pointer hover:brightness-110 transition-all"
                              onClick={(e) => { e.stopPropagation(); setZoomedImage((m.gangs as any).image_url); }}
                            >
                              <img src={(m.gangs as any).image_url} alt={(m.gangs as any).name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-3 bg-gradient-to-b from-purple-400 to-purple-600" />
                          )}
                          <div className="px-5 py-3 bg-purple-500/10">
                            <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Familie / Bande</p>
                            <p className="text-lg font-bold text-purple-300 flex items-center gap-2 mt-0.5">
                              <Siren className="w-4 h-4" />
                              {(m.gangs as any)?.name || "–"}
                              {(m.gangs as any)?.category && (
                                <span className="text-xs font-normal text-purple-400/70">({(m.gangs as any).category})</span>
                              )}
                            </p>
                            {m.gang_info && <p className="text-xs text-purple-400/80 mt-1">{m.gang_info}</p>}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {m.description && (
                        <p className="text-sm leading-relaxed text-foreground/80 bg-secondary/30 rounded-lg p-4 border border-border/50">
                          {m.description}
                        </p>
                      )}

                      {/* Counts */}
                      <div className="flex gap-4">
                        <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-xl px-6 py-4 text-center min-w-[100px]">
                          <p className="text-3xl font-black text-primary tabular-nums">{m.suspects_count}</p>
                          <p className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold mt-1">Tatverdächtige</p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-xl px-6 py-4 text-center min-w-[100px]">
                          <p className="text-3xl font-black text-primary tabular-nums">{m.hostages_count}</p>
                          <p className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold mt-1">Geiseln</p>
                        </div>
                      </div>

                      {/* Vehicles */}
                      {vehicles.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5 font-semibold">
                            <Car className="w-3.5 h-3.5" /> Fahrzeuge ({vehicles.length})
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {vehicles.map((v: any) => (
                              <div key={v.id} className="bg-background/80 border border-border/80 rounded-xl p-4 space-y-2.5 hover:border-primary/20 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-primary">{v.vehicle_type} – {v.model}</p>
                                  {v.license_plate && (
                                    <span className="text-sm font-black font-mono bg-yellow-400/20 text-yellow-300 px-3.5 py-1.5 rounded-lg border-2 border-yellow-400/40 tracking-[0.2em] shadow-[0_0_12px_rgba(250,204,21,0.1)]">
                                      {v.license_plate}
                                    </span>
                                  )}
                                </div>
                                {v.owner_info && <p className="text-xs text-muted-foreground">Besitzer: {v.owner_info}</p>}
                                <div className="flex items-center gap-3 flex-wrap">
                                  {[
                                    { label: "P", color: v.primary_color },
                                    { label: "S", color: v.secondary_color },
                                    { label: "Pearl", color: v.pearl_color },
                                    { label: "Neon", color: v.neon_color },
                                  ].map((c) =>
                                    c.color && c.color !== "#000000" ? (
                                      <div key={c.label} className="flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded-full border border-border shadow-sm" style={{ background: c.color }} />
                                        <span className="text-[10px] text-muted-foreground font-medium">{c.label}</span>
                                      </div>
                                    ) : null
                                  )}
                                  {v.xenon && (
                                    <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-md font-semibold border border-yellow-500/20">Xenon</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Crew */}
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5 font-semibold">
                          <Users className="w-3.5 h-3.5" /> Besatzung
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {[
                            { label: "Pilot", value: m.pilot },
                            { label: "Co-Pilot", value: m.co_pilot },
                            { label: "Left Gunner", value: m.left_gunner },
                            { label: "Right Gunner", value: m.right_gunner },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 py-1">
                              <span className="text-xs text-muted-foreground font-medium w-28 shrink-0">{label}:</span>
                              <span className={`text-sm font-medium ${value && value !== "none" ? "text-primary" : "text-muted-foreground/50"}`}>
                                {value && value !== "none" ? value : "–"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delete */}
                      {canDelete && (
                        <div className="flex justify-end pt-3 border-t border-border/30">
                          <Button size="sm" variant="destructive" onClick={() => deleteMission.mutate(m.id)} className="gap-1.5 shadow-lg shadow-destructive/10">
                            <Trash2 className="w-4 h-4" /> Löschen
                          </Button>
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
                <div
                  key={`p-${p.id}`}
                  className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 ${
                    expanded ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border hover:border-primary/20"
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : `p-${p.id}`)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs px-3.5 py-1.5 rounded-lg border font-bold tracking-wide bg-primary/15 text-primary border-primary/25">10-80</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(p.pursuit_date).toLocaleDateString("de-DE")} · {new Date(p.pursuit_date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {p.vehicle_model && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" /> {p.vehicle_model}
                        </span>
                      )}
                      {p.license_plate && (
                        <span className="text-sm font-black font-mono bg-yellow-400/20 text-yellow-300 px-3.5 py-1.5 rounded-lg border-2 border-yellow-400/40 tracking-[0.2em] shadow-[0_0_12px_rgba(250,204,21,0.1)]">
                          {p.license_plate}
                        </span>
                      )}
                      {pPhotos.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Image className="w-3.5 h-3.5" /> {pPhotos.length}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="px-6 pb-6 space-y-5 border-t border-border/40 pt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {p.description && (
                        <p className="text-sm leading-relaxed text-foreground/80 bg-secondary/30 rounded-lg p-4 border border-border/50">
                          {p.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Fahrzeug</p>
                          <p className="text-sm text-primary font-medium mt-1">{p.vehicle_model || "–"}</p>
                        </div>
                        <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Kennzeichen</p>
                          <p className="text-lg font-black font-mono text-yellow-300 mt-1 tracking-[0.2em]">{p.license_plate || "–"}</p>
                        </div>
                      </div>

                      {pPhotos.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5 font-semibold">
                            <Image className="w-3.5 h-3.5" /> Fotos ({pPhotos.length})
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {pPhotos.map((ph: any) => (
                              <img
                                key={ph.id}
                                src={ph.image_url}
                                alt="Foto"
                                className="rounded-xl border border-border object-cover w-full h-36 cursor-pointer hover:brightness-110 hover:border-primary/30 transition-all duration-200"
                                onClick={(e) => { e.stopPropagation(); setZoomedImage(ph.image_url); }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5 font-semibold">
                          <Users className="w-3.5 h-3.5" /> Besatzung
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {[
                            { label: "Pilot", value: p.pilot },
                            { label: "Co-Pilot", value: p.co_pilot },
                            { label: "Left Gunner", value: p.left_gunner },
                            { label: "Right Gunner", value: p.right_gunner },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 py-1">
                              <span className="text-xs text-muted-foreground font-medium w-28 shrink-0">{label}:</span>
                              <span className={`text-sm font-medium ${value && value !== "none" ? "text-primary" : "text-muted-foreground/50"}`}>
                                {value && value !== "none" ? value : "–"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {canDelete && (
                        <div className="flex justify-end pt-3 border-t border-border/30">
                          <Button size="sm" variant="destructive" onClick={() => deletePursuit.mutate(p.id)} className="gap-1.5 shadow-lg shadow-destructive/10">
                            <Trash2 className="w-4 h-4" /> Löschen
                          </Button>
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

      {/* Image Lightbox */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 border-border backdrop-blur-sm">
          {zoomedImage && <img src={zoomedImage} alt="Vergrößert" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProtokollePage;
