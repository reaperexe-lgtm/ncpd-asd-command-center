import { logActivity } from "@/lib/activityLog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, FileText, Car, Users, Clock, Siren, Image, ChevronDown, Shield, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const LOCATION_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Staatsbank: { bg: "from-emerald-600/30 to-emerald-800/10", text: "text-emerald-300", border: "border-emerald-500/40", glow: "shadow-emerald-500/10" },
  Juwelier: { bg: "from-purple-600/30 to-purple-800/10", text: "text-purple-300", border: "border-purple-500/40", glow: "shadow-purple-500/10" },
  "Human Labs": { bg: "from-lime-600/30 to-lime-800/10", text: "text-lime-300", border: "border-lime-500/40", glow: "shadow-lime-500/10" },
  Geiselnahme: { bg: "from-orange-600/30 to-orange-800/10", text: "text-orange-300", border: "border-orange-500/40", glow: "shadow-orange-500/10" },
  Razzia: { bg: "from-red-600/30 to-red-800/10", text: "text-red-300", border: "border-red-500/40", glow: "shadow-red-500/10" },
  Panikbutton: { bg: "from-yellow-600/30 to-yellow-800/10", text: "text-yellow-300", border: "border-yellow-500/40", glow: "shadow-yellow-500/10" },
  "10-12 Laden": { bg: "from-sky-600/30 to-sky-800/10", text: "text-sky-300", border: "border-sky-500/40", glow: "shadow-sky-500/10" },
  "1000 Laden": { bg: "from-sky-600/30 to-sky-800/10", text: "text-sky-300", border: "border-sky-500/40", glow: "shadow-sky-500/10" },
  "Paleto Bank": { bg: "from-teal-600/30 to-teal-800/10", text: "text-teal-300", border: "border-teal-500/40", glow: "shadow-teal-500/10" },
  "Sandy Laden": { bg: "from-amber-600/30 to-amber-800/10", text: "text-amber-300", border: "border-amber-500/40", glow: "shadow-amber-500/10" },
};

const DEFAULT_STYLE = { bg: "from-primary/20 to-primary/5", text: "text-primary", border: "border-primary/30", glow: "shadow-primary/10" };

const ProtokollePage = () => {
  const { isAdmin, role } = useAuth();
  const canDelete = isAdmin || role === "supervisor";
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mission" | "pursuit">(() => {
    const t = searchParams.get("type");
    return t === "mission" || t === "pursuit" ? t : "all";
  });
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const cameFromStats = (location.state as { from?: string } | null)?.from === "stats";

  // Auto-expand, scroll to & highlight entry when ?id= is present
  useEffect(() => {
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    if (!id) return;
    setExpandedId(type === "pursuit" ? `p-${id}` : id);
    setHighlightedId(id);
    // Scroll after entries had a chance to render
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`protokoll-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 350);
    // Remove highlight after a few seconds
    const highlightTimer = setTimeout(() => setHighlightedId(null), 4000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(highlightTimer);
    };
  }, [searchParams]);

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
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Protokolle</h1>
            <p className="text-xs text-muted-foreground">{totalCount} gespeicherte Einträge</p>
          </div>
        </div>
        <div className="flex gap-1 bg-card/80 p-1 rounded-xl border border-border backdrop-blur-sm">
          {[
            { key: "all" as const, label: "Alle" },
            { key: "mission" as const, label: "Einsätze" },
            { key: "pursuit" as const, label: "10-80" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 text-xs rounded-lg font-semibold transition-all duration-200 ${
                filter === key
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
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
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Lade Protokolle...</p>
          </div>
        </div>
      ) : allEntries.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-secondary/80 to-secondary/30 border border-border flex items-center justify-center">
            <FileText className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-lg font-semibold">Keine Protokolle vorhanden</p>
          <p className="text-sm mt-1 opacity-60">Erstelle einen neuen Einsatz oder eine Verfolgung</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allEntries.map((entry) => {
            if (entry.type === "mission") {
              const m = entry.data;
              const expanded = expandedId === m.id;
              const vehicles = (m.mission_vehicles as any[]) || [];
              const style = LOCATION_STYLES[m.location_type] || DEFAULT_STYLE;

              return (
                <div
                  key={m.id}
                  id={`protokoll-${m.id}`}
                  className={`rounded-xl overflow-hidden transition-all duration-300 ${
                    expanded
                      ? `border-2 ${style.border} shadow-xl ${style.glow}`
                      : "border border-border hover:border-primary/25 shadow-md shadow-black/10"
                  }`}
                >
                  {/* Header - gradient bar based on location type */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : m.id)}
                    className={`w-full text-left group relative bg-gradient-to-r ${style.bg} backdrop-blur-sm`}
                  >
                    {/* Subtle top accent line */}
                    <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${style.bg} opacity-60`} />

                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Location badge - bold & vivid */}
                        <span className={`text-sm px-4 py-1.5 rounded-lg font-black tracking-wide border-2 ${style.border} ${style.text} bg-background/40 backdrop-blur-sm shadow-inner`}>
                          {m.location_type}
                        </span>

                        {/* Datetime */}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium tabular-nums">
                            {new Date(m.tatzeit).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="text-sm font-bold tabular-nums">
                            {new Date(m.tatzeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Quick stats */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground/80">{m.suspects_count} TV</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-sm font-bold text-foreground/80">{m.hostages_count} Geiseln</span>
                        </div>

                        {vehicles.length > 0 && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground bg-background/30 px-2 py-0.5 rounded-md">
                            <Car className="w-4 h-4" /> {vehicles.length}
                          </span>
                        )}

                        {/* Gang badge */}
                        {(m.gangs as any)?.name && (
                          <span className="text-sm px-3 py-1.5 rounded-lg border-2 font-black bg-purple-500/20 text-purple-300 border-purple-500/40 flex items-center gap-1.5 shadow-md shadow-purple-500/10">
                            <Siren className="w-4 h-4" />{(m.gangs as any).name}
                          </span>
                        )}
                        {m.gang_info && (
                          <span className="text-xs px-2.5 py-1 rounded-lg border bg-red-500/15 text-red-300 border-red-500/30 font-semibold">{m.gang_info}</span>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expanded && (
                    <div className="bg-card/90 backdrop-blur-sm px-6 pb-6 space-y-6 border-t border-border/30 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Protokollschreiber - prominent card */}
                      <div className={`mt-5 flex items-center gap-4 bg-gradient-to-r ${style.bg} rounded-xl p-4 border ${style.border}`}>
                        <div className={`w-10 h-10 rounded-lg bg-background/30 flex items-center justify-center ${style.text}`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Protokollschreiber</p>
                          <p className={`text-base font-bold ${style.text}`}>{getProfileName(m.protokollschreiber)}</p>
                        </div>
                      </div>

                      {/* Location type as section title */}
                      <h3 className="text-xl font-black text-foreground/90 tracking-tight">{m.location_type}</h3>

                      {/* Gang info card */}
                      {((m.gangs as any)?.name || m.gang_info) && (
                        <div className="inline-flex items-stretch rounded-xl overflow-hidden border-2 border-purple-500/30 shadow-xl shadow-purple-500/10">
                          {(m.gangs as any)?.image_url ? (
                            <div
                              className="w-24 h-24 flex-shrink-0 cursor-pointer hover:brightness-125 transition-all relative"
                              onClick={(e) => { e.stopPropagation(); setZoomedImage((m.gangs as any).image_url); }}
                            >
                              <img src={(m.gangs as any).image_url} alt={(m.gangs as any).name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-900/30" />
                            </div>
                          ) : (
                            <div className="w-3 bg-gradient-to-b from-purple-400 to-purple-700" />
                          )}
                          <div className="px-5 py-3 bg-gradient-to-r from-purple-500/15 to-purple-500/5">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-black">Familie / Bande</p>
                            <p className="text-xl font-black text-purple-300 flex items-center gap-2 mt-1">
                              <Siren className="w-5 h-5" />
                              {(m.gangs as any)?.name || "–"}
                              {(m.gangs as any)?.category && (
                                <span className="text-sm font-normal text-purple-400/60">({(m.gangs as any).category})</span>
                              )}
                            </p>
                            {m.gang_info && <p className="text-sm text-purple-400/80 mt-1 font-medium">{m.gang_info}</p>}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {m.description && (
                        <div className="bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-xl p-5 border border-border/50">
                          <p className="text-sm leading-relaxed text-foreground/80">{m.description}</p>
                        </div>
                      )}

                      {/* Counts - big bold stat cards */}
                      <div className="flex gap-4">
                        {[
                          { value: m.suspects_count, label: "Tatverdächtige" },
                          { value: m.hostages_count, label: "Geiseln" },
                        ].map(({ value, label }) => (
                          <div key={label} className={`bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/25 rounded-xl px-7 py-5 text-center min-w-[110px] shadow-lg shadow-primary/10`}>
                            <p className="text-4xl font-black text-primary tabular-nums leading-none">{value}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-bold mt-2">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Vehicles */}
                      {vehicles.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2 font-black">
                            <Car className="w-4 h-4" /> Fahrzeuge ({vehicles.length})
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {vehicles.map((v: any) => (
                              <div key={v.id} className="bg-gradient-to-br from-background/90 to-background/50 border border-border rounded-xl p-4 space-y-3 hover:border-primary/20 transition-all shadow-md shadow-black/5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-bold text-primary">{v.vehicle_type} – {v.model}</p>
                                  {v.license_plate && (
                                    <span className="text-base font-black font-mono bg-gradient-to-br from-yellow-400/25 to-yellow-600/10 text-yellow-300 px-4 py-1.5 rounded-lg border-2 border-yellow-400/40 tracking-[0.25em] shadow-lg shadow-yellow-500/10">
                                      {v.license_plate}
                                    </span>
                                  )}
                                </div>
                                {v.owner_info && <p className="text-xs text-muted-foreground font-medium">Besitzer: <span className="text-foreground/70">{v.owner_info}</span></p>}
                                <div className="flex items-center gap-3 flex-wrap">
                                  {[
                                    { label: "P", color: v.primary_color },
                                    { label: "S", color: v.secondary_color },
                                    { label: "Pearl", color: v.pearl_color },
                                    { label: "Neon", color: v.neon_color },
                                  ].map((c) =>
                                    c.color && c.color !== "#000000" ? (
                                      <div key={c.label} className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full border-2 border-border shadow-md" style={{ background: c.color }} />
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">{c.label}</span>
                                      </div>
                                    ) : null
                                  )}
                                  {v.xenon && (
                                    <span className="text-[10px] bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 text-yellow-300 px-2.5 py-1 rounded-md font-black border border-yellow-500/25 tracking-wider">XENON</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Crew */}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2 font-black">
                          <Users className="w-4 h-4" /> Besatzung
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Pilot", value: m.pilot },
                            { label: "Co-Pilot", value: m.co_pilot },
                            { label: "Left Gunner", value: m.left_gunner },
                            { label: "Right Gunner", value: m.right_gunner },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 py-2 px-3 rounded-lg bg-background/40">
                              <span className="text-xs text-muted-foreground font-bold w-28 shrink-0">{label}:</span>
                              <span className={`text-sm font-semibold ${value && value !== "none" ? "text-primary" : "text-muted-foreground/40"}`}>
                                {value && value !== "none" ? value : "–"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delete */}
                      {canDelete && (
                        <div className="flex justify-end pt-3 border-t border-border/20">
                          <Button size="sm" variant="destructive" onClick={() => deleteMission.mutate(m.id)} className="gap-2 shadow-lg shadow-destructive/20 font-bold px-5">
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
                  id={`protokoll-${p.id}`}
                  className={`rounded-xl overflow-hidden transition-all duration-300 ${
                    expanded
                      ? "border-2 border-primary/30 shadow-xl shadow-primary/10"
                      : "border border-border hover:border-primary/25 shadow-md shadow-black/10"
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : `p-${p.id}`)}
                    className="w-full text-left group bg-gradient-to-r from-primary/15 to-primary/3"
                  >
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm px-4 py-1.5 rounded-lg font-black tracking-wide border-2 border-primary/40 text-primary bg-background/40 backdrop-blur-sm shadow-inner">
                          10-80
                        </span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium tabular-nums">
                            {new Date(p.pursuit_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="text-sm font-bold tabular-nums">
                            {new Date(p.pursuit_date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {p.vehicle_model && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Car className="w-4 h-4" /> {p.vehicle_model}
                          </span>
                        )}
                        {p.license_plate && (
                          <span className="text-base font-black font-mono bg-gradient-to-br from-yellow-400/25 to-yellow-600/10 text-yellow-300 px-4 py-1.5 rounded-lg border-2 border-yellow-400/40 tracking-[0.25em] shadow-lg shadow-yellow-500/10">
                            {p.license_plate}
                          </span>
                        )}
                        {pPhotos.length > 0 && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1 bg-background/30 px-2 py-0.5 rounded-md">
                            <Image className="w-4 h-4" /> {pPhotos.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expanded && (
                    <div className="bg-card/90 backdrop-blur-sm px-6 pb-6 space-y-6 border-t border-border/30 animate-in fade-in slide-in-from-top-2 duration-300">
                      {p.description && (
                        <div className="mt-5 bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-xl p-5 border border-border/50">
                          <p className="text-sm leading-relaxed text-foreground/80">{p.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-5">
                        <div className="bg-gradient-to-br from-background/90 to-background/50 border border-border rounded-xl p-5 shadow-md shadow-black/5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Fahrzeug</p>
                          <p className="text-base text-primary font-bold mt-1.5">{p.vehicle_model || "–"}</p>
                        </div>
                        <div className="bg-gradient-to-br from-background/90 to-background/50 border border-border rounded-xl p-5 shadow-md shadow-black/5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Kennzeichen</p>
                          <p className="text-xl font-black font-mono text-yellow-300 mt-1.5 tracking-[0.25em]">{p.license_plate || "–"}</p>
                        </div>
                      </div>

                      {pPhotos.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2 font-black">
                            <Image className="w-4 h-4" /> Fotos ({pPhotos.length})
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {pPhotos.map((ph: any) => (
                              <img
                                key={ph.id}
                                src={ph.image_url}
                                alt="Foto"
                                className="rounded-xl border-2 border-border object-cover w-full h-40 cursor-pointer hover:brightness-125 hover:border-primary/30 transition-all duration-200 shadow-lg shadow-black/10"
                                onClick={(e) => { e.stopPropagation(); setZoomedImage(ph.image_url); }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2 font-black">
                          <Users className="w-4 h-4" /> Besatzung
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Pilot", value: p.pilot },
                            { label: "Co-Pilot", value: p.co_pilot },
                            { label: "Left Gunner", value: p.left_gunner },
                            { label: "Right Gunner", value: p.right_gunner },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 py-2 px-3 rounded-lg bg-background/40">
                              <span className="text-xs text-muted-foreground font-bold w-28 shrink-0">{label}:</span>
                              <span className={`text-sm font-semibold ${value && value !== "none" ? "text-primary" : "text-muted-foreground/40"}`}>
                                {value && value !== "none" ? value : "–"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {canDelete && (
                        <div className="flex justify-end pt-3 border-t border-border/20">
                          <Button size="sm" variant="destructive" onClick={() => deletePursuit.mutate(p.id)} className="gap-2 shadow-lg shadow-destructive/20 font-bold px-5">
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
        <DialogContent className="max-w-4xl p-2 bg-background/95 border-border backdrop-blur-md shadow-2xl">
          {zoomedImage && <img src={zoomedImage} alt="Vergrößert" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProtokollePage;
