import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Eye, EyeOff, Search, Upload, ChevronUp, ChevronDown, Map as MapIcon } from "lucide-react";

type MapBackground = { id: string; name: string; image_url: string; sort_order: number };
type MapLocation = {
  id: string;
  background_id: string | null;
  name: string;
  description: string | null;
  category: string;
  color: string;
  x_percent: number;
  y_percent: number;
  is_hidden: boolean;
  sort_order: number;
};

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];

export default function OrtskundePage() {
  const { user, role } = useAuth();
  const canManage = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeBgId, setActiveBgId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [editing, setEditing] = useState<MapLocation | null>(null);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number; moved: boolean } | null>(null);

  // Form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("allgemein");
  const [color, setColor] = useState(COLORS[0]);
  const [hidden, setHidden] = useState(false);

  // Map mgmt dialog
  const [showMapsDialog, setShowMapsDialog] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [newMapFile, setNewMapFile] = useState<File | null>(null);

  const { data: backgrounds = [] } = useQuery({
    queryKey: ["map-backgrounds"],
    queryFn: async () => {
      const { data } = await supabase.from("map_backgrounds" as any).select("*").order("sort_order");
      return (data || []) as any as MapBackground[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["map-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("map_locations" as any).select("*").order("sort_order").order("name");
      return (data || []) as any as MapLocation[];
    },
  });

  // Default to first map
  useEffect(() => {
    if (!activeBgId && backgrounds.length > 0) setActiveBgId(backgrounds[0].id);
  }, [backgrounds, activeBgId]);

  const activeBg = backgrounds.find((b) => b.id === activeBgId);
  const mapLocations = locations.filter((l) => l.background_id === activeBgId);

  const saveLoc = useMutation({
    mutationFn: async (payload: Partial<MapLocation> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from("map_locations" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...mapLocations.map((l) => l.sort_order));
        const { error } = await supabase.from("map_locations" as any).insert({
          ...payload, background_id: activeBgId, sort_order: maxOrder + 1, created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-locations"] }); toast.success("Ort gespeichert"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("map_locations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-locations"] }); toast.success("Ort gelöscht"); closeDialog(); },
  });

  const reorderLoc = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const sorted = [...mapLocations].sort((a, b) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex((l) => l.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx], b = sorted[swapIdx];
      await supabase.from("map_locations" as any).update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("map_locations" as any).update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["map-locations"] }),
  });

  const addBackground = useMutation({
    mutationFn: async () => {
      if (!newMapFile || !newMapName.trim()) throw new Error("Name und Bild erforderlich");
      const path = `ortskunde/${Date.now()}_${newMapFile.name}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, newMapFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const maxOrder = Math.max(0, ...backgrounds.map((b) => b.sort_order));
      const { error } = await supabase.from("map_backgrounds" as any).insert({
        name: newMapName, image_url: urlData.publicUrl, sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-backgrounds"] });
      toast.success("Karte hinzugefügt");
      setNewMapName(""); setNewMapFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("map_backgrounds" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-backgrounds"] });
      qc.invalidateQueries({ queryKey: ["map-locations"] });
      toast.success("Karte gelöscht");
    },
  });

  const closeDialog = () => {
    setEditing(null); setPendingPos(null);
    setName(""); setDesc(""); setCategory("allgemein"); setColor(COLORS[0]); setHidden(false);
  };

  const openEdit = (loc: MapLocation) => {
    setEditing(loc);
    setName(loc.name); setDesc(loc.description || "");
    setCategory(loc.category); setColor(loc.color); setHidden(loc.is_hidden);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (dragRef.current?.moved) return;
    if (!placing || !canManage) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const innerX = (e.clientX - rect.left - pan.x) / zoom;
    const innerY = (e.clientY - rect.top - pan.y) / zoom;
    const x = (innerX / rect.width) * 100;
    const y = (innerY / rect.height) * 100;
    setPendingPos({ x, y });
    setPlacing(false);
  };

  const submit = () => {
    if (!name.trim()) return toast.error("Name fehlt");
    if (editing) {
      saveLoc.mutate({ id: editing.id, name, description: desc || null, category, color, is_hidden: hidden });
    } else if (pendingPos) {
      saveLoc.mutate({
        name, description: desc || null, category, color, is_hidden: hidden,
        x_percent: pendingPos.x, y_percent: pendingPos.y,
      });
    }
  };

  const filtered = mapLocations.filter((l) =>
    (showHidden || !l.is_hidden) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) ||
     (l.description || "").toLowerCase().includes(search.toLowerCase()))
  );

  // Wheel zoom centred on cursor
  const onWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    const newZoom = Math.min(8, Math.max(0.5, zoom * (1 + delta)));
    const ratio = newZoom / zoom;
    setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio });
    setZoom(newZoom);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (placing) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  };
  const onMouseUp = () => { setTimeout(() => { dragRef.current = null; }, 50); };

  const jumpTo = (loc: MapLocation) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newZoom = 3;
    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - (loc.x_percent / 100) * rect.width * newZoom,
      y: rect.height / 2 - (loc.y_percent / 100) * rect.height * newZoom,
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto map-no-helo-cursor">
      <style>{`.map-no-helo-cursor, .map-no-helo-cursor * { cursor: auto !important; }
        .map-no-helo-cursor button, .map-no-helo-cursor a, .map-no-helo-cursor [role="button"], .map-no-helo-cursor input, .map-no-helo-cursor textarea, .map-no-helo-cursor label { cursor: pointer !important; }
        .map-no-helo-cursor input, .map-no-helo-cursor textarea { cursor: text !important; }
        .map-canvas { cursor: grab; }
        .map-canvas.dragging { cursor: grabbing !important; }
        .map-canvas.placing { cursor: crosshair !important; }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Ortskunde-Karte</h1>
            <p className="text-xs text-muted-foreground">{mapLocations.length} Orte · Mausrad zum Zoomen, ziehen zum Verschieben</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ort suchen..." className="pl-8 w-56" />
          </div>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setShowHidden((v) => !v)} className="gap-1.5">
                {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showHidden ? "Versteckte aus" : "Versteckte ein"}
              </Button>
              <Button onClick={() => { if (!activeBgId) return toast.error("Erst eine Karte wählen"); setPlacing(true); toast.info("Klicke jetzt auf die Karte"); }} className="gap-1.5">
                <Plus className="w-4 h-4" /> Neuer Ort
              </Button>
              <Button variant="outline" onClick={() => setShowMapsDialog(true)} className="gap-1.5">
                <MapIcon className="w-4 h-4" /> Karten verwalten
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Map tabs */}
      {backgrounds.length > 0 && (
        <div className="flex gap-1 flex-wrap border-b border-border pb-1">
          {backgrounds.map((b) => (
            <button key={b.id} onClick={() => { setActiveBgId(b.id); setZoom(1); setPan({ x: 0, y: 0 }); }}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${activeBgId === b.id ? "bg-primary/15 text-primary border-b-2 border-primary -mb-[2px]" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"}`}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      {search && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.slice(0, 12).map((l) => (
            <button key={l.id} onClick={() => jumpTo(l)}
              className="text-xs px-2 py-1 rounded border border-border bg-card hover:border-primary/50">
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: l.color }} /> {l.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div
          ref={containerRef}
          className={`map-canvas relative w-full bg-card border border-border rounded-lg overflow-hidden select-none ${placing ? "placing" : ""} ${dragRef.current ? "dragging" : ""}`}
          style={{ height: "70vh" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onClick={handleMapClick}
        >
          <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            {activeBg ? (
              <img src={activeBg.image_url} alt={activeBg.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Keine Karte vorhanden – als Admin oben "Karten verwalten" öffnen.
              </div>
            )}

            {filtered.map((loc) => (
              <button
                key={loc.id}
                onClick={(e) => { e.stopPropagation(); if (canManage) openEdit(loc); }}
                className="absolute -translate-x-1/2 -translate-y-full group"
                style={{ left: `${loc.x_percent}%`, top: `${loc.y_percent}%` }}
              >
                <div className="flex flex-col items-center" style={{ transform: `scale(${1 / zoom})`, transformOrigin: "bottom center" }}>
                  <div className="px-2 py-0.5 rounded bg-background/95 border text-[11px] font-medium whitespace-nowrap mb-0.5 shadow-sm"
                    style={{ borderColor: loc.color, color: loc.color }}>
                    {loc.name}{loc.is_hidden && " 🔒"}
                  </div>
                  <MapPin className="w-6 h-6 drop-shadow-md" style={{ color: loc.color, fill: loc.color }} />
                </div>
              </button>
            ))}
          </div>

          <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-card/95 border border-border rounded-md p-1 backdrop-blur z-10">
            <button className="w-8 h-8 hover:bg-secondary rounded text-lg" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(8, z + 0.5)); }}>+</button>
            <button className="w-8 h-8 hover:bg-secondary rounded text-lg" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.5, z - 0.5)); }}>−</button>
            <button className="w-8 h-8 hover:bg-secondary rounded text-xs" onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}>⤾</button>
          </div>

          {placing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-sm px-3 py-1.5 rounded shadow z-10">
              Klicke auf die Karte, um den Ort zu setzen
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-card border border-border rounded-lg p-3 space-y-1 max-h-[70vh] overflow-y-auto">
          <h2 className="text-sm font-semibold text-primary mb-2 px-1">Legende ({filtered.length})</h2>
          {filtered.length === 0 && <p className="text-xs text-muted-foreground px-1">Keine Einträge</p>}
          {[...filtered].sort((a, b) => a.sort_order - b.sort_order).map((l, idx, arr) => (
            <div key={l.id} className="flex items-center gap-1 group hover:bg-secondary/50 rounded px-1 py-1">
              <button onClick={() => jumpTo(l)} className="flex-1 flex items-center gap-2 text-left text-sm min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: l.color, fill: l.color }} />
                <span className="truncate">{l.name}</span>
                {l.is_hidden && <span className="text-xs">🔒</span>}
              </button>
              {canManage && (
                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                  <button disabled={idx === 0} onClick={() => reorderLoc.mutate({ id: l.id, direction: "up" })}
                    className="p-0.5 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button disabled={idx === arr.length - 1} onClick={() => reorderLoc.mutate({ id: l.id, direction: "down" })}
                    className="p-0.5 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit location dialog */}
      <Dialog open={!!pendingPos || !!editing} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Ort bearbeiten" : "Neuer Ort"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Casino" /></div>
            <div><Label>Beschreibung</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategorie</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              <div>
                <Label>Farbe</Label>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-foreground scale-110" : "border-transparent"} transition-transform`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              Versteckter Punkt
            </label>
          </div>
          <DialogFooter className="flex sm:justify-between">
            {editing ? (
              <Button variant="destructive" onClick={() => deleteLoc.mutate(editing.id)} className="gap-1.5">
                <Trash2 className="w-4 h-4" /> Löschen
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog}>Abbrechen</Button>
              <Button onClick={submit} disabled={saveLoc.isPending}>{editing ? "Speichern" : "Erstellen"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maps management dialog */}
      <Dialog open={showMapsDialog} onOpenChange={setShowMapsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Karten verwalten</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {backgrounds.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 p-2 border border-border rounded">
                  <img src={b.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                  <span className="flex-1 text-sm truncate">{b.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Karte "${b.name}" und alle zugehörigen Orte löschen?`)) deleteBg.mutate(b.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {backgrounds.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Karten.</p>}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <Label>Neue Karte hinzufügen</Label>
              <Input placeholder="Name (z.B. Los Santos)" value={newMapName} onChange={(e) => setNewMapName(e.target.value)} />
              <Input type="file" accept="image/*" onChange={(e) => setNewMapFile(e.target.files?.[0] || null)} />
              <Button onClick={() => addBackground.mutate()} disabled={addBackground.isPending || !newMapFile || !newMapName.trim()} className="w-full gap-1.5">
                <Upload className="w-4 h-4" /> Hochladen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}