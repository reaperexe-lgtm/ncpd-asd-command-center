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
import { MapPin, Plus, Trash2, Eye, EyeOff, Search, Upload, X, Edit2 } from "lucide-react";

type MapLocation = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  color: string;
  x_percent: number;
  y_percent: number;
  is_hidden: boolean;
};

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];

export default function OrtskundePage() {
  const { user, role } = useAuth();
  const canManage = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [editing, setEditing] = useState<MapLocation | null>(null);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("allgemein");
  const [color, setColor] = useState(COLORS[0]);
  const [hidden, setHidden] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["map-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("map_settings" as any).select("*").limit(1).maybeSingle();
      return data as any;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["map-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("map_locations" as any).select("*").order("name");
      return (data || []) as any as MapLocation[];
    },
  });

  const saveLoc = useMutation({
    mutationFn: async (payload: Partial<MapLocation> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from("map_locations" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("map_locations" as any).insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-locations"] });
      toast.success("Ort gespeichert");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("map_locations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-locations"] });
      toast.success("Ort gelöscht");
      closeDialog();
    },
  });

  const uploadBackground = async (file: File) => {
    const path = `ortskunde/background_${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    const url = urlData.publicUrl;
    if (settings?.id) {
      await supabase.from("map_settings" as any).update({ background_url: url, updated_at: new Date().toISOString() }).eq("id", settings.id);
    } else {
      await supabase.from("map_settings" as any).insert({ background_url: url });
    }
    qc.invalidateQueries({ queryKey: ["map-settings"] });
    toast.success("Karte aktualisiert");
  };

  const closeDialog = () => {
    setEditing(null);
    setPendingPos(null);
    setName(""); setDesc(""); setCategory("allgemein"); setColor(COLORS[0]); setHidden(false);
  };

  const openEdit = (loc: MapLocation) => {
    setEditing(loc);
    setName(loc.name);
    setDesc(loc.description || "");
    setCategory(loc.category);
    setColor(loc.color);
    setHidden(loc.is_hidden);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (!placing || !canManage) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    // Convert click to image-relative percent (account for pan/zoom)
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
      saveLoc.mutate({
        id: editing.id, name, description: desc || null, category, color, is_hidden: hidden,
      });
    } else if (pendingPos) {
      saveLoc.mutate({
        name, description: desc || null, category, color, is_hidden: hidden,
        x_percent: pendingPos.x, y_percent: pendingPos.y,
      });
    }
  };

  // Search results -> jump
  const filtered = locations.filter((l) =>
    (showHidden || !l.is_hidden) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) ||
     (l.description || "").toLowerCase().includes(search.toLowerCase()))
  );

  // Pan / zoom handlers
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.min(4, Math.max(0.5, z + delta)));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (placing) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  };
  const onMouseUp = () => { dragRef.current = null; };

  const jumpTo = (loc: MapLocation) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setZoom(2);
    setPan({
      x: rect.width / 2 - (loc.x_percent / 100) * rect.width * 2,
      y: rect.height / 2 - (loc.y_percent / 100) * rect.height * 2,
    });
  };

  const bg = settings?.background_url;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Ortskunde-Karte</h1>
            <p className="text-xs text-muted-foreground">{locations.length} Orte · Klick auf Karte zoomt, ziehen zum Verschieben</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ort suchen..." className="pl-8 w-56" />
          </div>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setShowHidden((v) => !v)} className="gap-1.5">
                {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showHidden ? "Versteckte aus" : "Versteckte ein"}
              </Button>
              <Button onClick={() => { setPlacing(true); toast.info("Klicke jetzt auf die Karte"); }} className="gap-1.5">
                <Plus className="w-4 h-4" /> Neuer Ort
              </Button>
              <label className="inline-flex">
                <Button variant="outline" asChild className="gap-1.5 cursor-pointer">
                  <span><Upload className="w-4 h-4" /> Karte hochladen</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBackground(e.target.files[0])} />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Search results bar */}
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

      <div
        ref={containerRef}
        className="relative w-full bg-card border border-border rounded-lg overflow-hidden select-none"
        style={{ height: "70vh", cursor: placing ? "crosshair" : dragRef.current ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onClick={handleMapClick}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
        >
          {bg ? (
            <img ref={imgRef} src={bg} alt="Karte" className="w-full h-full object-contain pointer-events-none" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Keine Karte hochgeladen
            </div>
          )}

          {/* Markers */}
          {filtered.map((loc) => (
            <button
              key={loc.id}
              onClick={(e) => { e.stopPropagation(); if (canManage) openEdit(loc); }}
              className="absolute -translate-x-1/2 -translate-y-full group"
              style={{ left: `${loc.x_percent}%`, top: `${loc.y_percent}%` }}
            >
              <div className="flex flex-col items-center" style={{ transform: `scale(${1 / zoom})`, transformOrigin: "bottom center" }}>
                <div className="px-2 py-0.5 rounded bg-background/90 border text-[11px] font-medium whitespace-nowrap mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ borderColor: loc.color, color: loc.color }}>
                  {loc.name}{loc.is_hidden && " 🔒"}
                </div>
                <MapPin className="w-6 h-6 drop-shadow-md" style={{ color: loc.color, fill: loc.color }} />
              </div>
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-card/90 border border-border rounded-md p-1 backdrop-blur">
          <button className="w-8 h-8 hover:bg-secondary rounded text-lg" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(4, z + 0.25)); }}>+</button>
          <button className="w-8 h-8 hover:bg-secondary rounded text-lg" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.5, z - 0.25)); }}>−</button>
          <button className="w-8 h-8 hover:bg-secondary rounded text-xs" onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}>⤾</button>
        </div>

        {placing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-sm px-3 py-1.5 rounded shadow">
            Klicke auf die Karte, um den Ort zu setzen
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={!!pendingPos || !!editing} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Ort bearbeiten" : "Neuer Ort"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Casino" />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategorie</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="allgemein" />
              </div>
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
              Versteckter Punkt (nur sichtbar wenn "Versteckte ein")
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
              <Button onClick={submit} disabled={saveLoc.isPending}>
                {editing ? "Speichern" : "Erstellen"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}