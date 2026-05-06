import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, EyeOff, Search, Upload, Map as MapIcon, ChevronDown, ChevronRight, X, Pen, Square as SquareIcon, Layers, Eye } from "lucide-react";
import GtaVMap from "@/components/GtaVMap";

type MapBackground = { id: string; name: string; image_url: string; sort_order: number };
type MapLocation = {
  id: string; background_id: string | null; name: string; description: string | null;
  category: string; color: string; x_percent: number; y_percent: number;
  is_hidden: boolean; sort_order: number; icon: string | null; icon_type: string;
};
type MapArea = {
  id: string; background_id: string | null; name: string; color: string;
  fill_opacity: number; points: { x: number; y: number }[]; is_hidden: boolean; category: string;
};
type MapDrawing = {
  id: string; background_id: string | null; name: string; color: string;
  stroke_width: number; points: { x: number; y: number }[]; is_hidden: boolean;
};

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4", "#ffffff", "#000000"];
const EMOJI_PRESETS = ["📍", "🚓", "💊", "🌳", "⭐", "🏠", "🏨", "🍽️", "⚔️", "🛒", "⛽", "🏥", "🏛️", "🅿️", "✈️", "🚁", "🔫", "💰", "💎", "🎰", "🏪", "🚧", "📦", "🎯"];
const LIVE_MAP_URL = "tiled://gta-v";

const CATEGORIES = [
  { key: "bezirke", label: "Bezirke", icon: "🟧" },
  { key: "fraktionen", label: "Fraktionen", icon: "⚔️" },
  { key: "polizei", label: "Polizei", icon: "🚓" },
  { key: "sonstiges", label: "Sonstiges", icon: "📍" },
  { key: "regierung", label: "Regierung", icon: "🏛️" },
  { key: "krankenhaus", label: "Krankenhaus", icon: "🏥" },
  { key: "restaurant", label: "Restaurant", icon: "🍽️" },
  { key: "shops", label: "Shops", icon: "🛒" },
  { key: "garagen", label: "Garagen", icon: "🔧" },
  { key: "parks", label: "Parks", icon: "🌳" },
  { key: "immobilien", label: "Immobilien", icon: "🏠" },
];

export default function OrtskundePage() {
  const { user, role } = useAuth();
  const canEdit = !!role; // any approved user
  const canDelete = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");
  const canManageMaps = canDelete;
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeBgId, setActiveBgId] = useState<string | null>(null);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);
  const [showHiddenDialog, setShowHiddenDialog] = useState(false);
  const [hiddenPwInput, setHiddenPwInput] = useState("");

  // Modes
  type Mode = null | "marker" | "area" | "draw";
  const [mode, setMode] = useState<Mode>(null);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);

  const [editing, setEditing] = useState<MapLocation | null>(null);
  const [editingArea, setEditingArea] = useState<MapArea | null>(null);
  const [editingDraw, setEditingDraw] = useState<MapDrawing | null>(null);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingArea, setPendingArea] = useState<{ x: number; y: number }[] | null>(null);
  const [pendingDraw, setPendingDraw] = useState<{ x: number; y: number }[] | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number; moved: boolean } | null>(null);

  // Form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("sonstiges");
  const [color, setColor] = useState(COLORS[0]);
  const [hidden, setHidden] = useState(false);
  const [iconType, setIconType] = useState<"pin" | "emoji">("pin");
  const [iconValue, setIconValue] = useState("📍");
  const [fillOpacity, setFillOpacity] = useState(0.25);
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Category collapse + filter state
  const [categoryFilter, setCategoryFilter] = useState<Record<string, boolean>>({});
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  // Maps mgmt
  const [showMapsDialog, setShowMapsDialog] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [newMapFile, setNewMapFile] = useState<File | null>(null);

  // Marker click popup
  const [popupLoc, setPopupLoc] = useState<MapLocation | null>(null);
  const [popupArea, setPopupArea] = useState<MapArea | null>(null);

  const { data: backgrounds = [] } = useQuery({
    queryKey: ["map-backgrounds"],
    queryFn: async () => {
      const { data } = await supabase.from("map_backgrounds").select("*").order("sort_order");
      return (data || []) as MapBackground[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["map-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("map_locations").select("*").order("name");
      return (data || []) as any as MapLocation[];
    },
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["map-areas"],
    queryFn: async () => {
      const { data } = await supabase.from("map_areas").select("*");
      return ((data || []) as any[]).map(a => ({ ...a, points: Array.isArray(a.points) ? a.points : [] })) as MapArea[];
    },
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ["map-drawings"],
    queryFn: async () => {
      const { data } = await supabase.from("map_drawings").select("*");
      return ((data || []) as any[]).map(d => ({ ...d, points: Array.isArray(d.points) ? d.points : [] })) as MapDrawing[];
    },
  });

  useEffect(() => {
    if (!activeBgId && backgrounds.length > 0) setActiveBgId(backgrounds[0].id);
  }, [backgrounds, activeBgId]);

  // Realtime: live updates for everyone when map data changes
  useEffect(() => {
    const channel = supabase
      .channel("ortskunde-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "map_locations" },
        () => qc.invalidateQueries({ queryKey: ["map-locations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "map_areas" },
        () => qc.invalidateQueries({ queryKey: ["map-areas"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "map_drawings" },
        () => qc.invalidateQueries({ queryKey: ["map-drawings"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "map_backgrounds" },
        () => qc.invalidateQueries({ queryKey: ["map-backgrounds"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const activeBg = backgrounds.find(b => b.id === activeBgId);
  const liveBg = backgrounds.find(b => b.image_url === LIVE_MAP_URL);
  const mapLocations = locations.filter(l => l.background_id === activeBgId);
  const mapAreas = areas.filter(a => a.background_id === activeBgId);
  const mapDrawings = drawings.filter(d => d.background_id === activeBgId);

  const visibleLocations = mapLocations.filter(l => (hiddenUnlocked || !l.is_hidden) && categoryFilter[l.category] !== false);
  const visibleAreas = mapAreas.filter(a => (hiddenUnlocked || !a.is_hidden) && categoryFilter[a.category] !== false);
  const visibleDrawings = mapDrawings.filter(d => hiddenUnlocked || !d.is_hidden);

  const searched = search
    ? visibleLocations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    : visibleLocations;
  // Compensate marker/label size for current zoom so they remain readable
  // at every zoom level. Clamped so they never get too tiny when zoomed
  // in nor too huge when zoomed out.
  const rawCompensation = 1 / Math.pow(zoom, 0.65);
  const markerScale = Math.min(1.35, Math.max(0.5, rawCompensation));
  // Kept for backwards compat with existing usages (SVG label fontSize, etc.)
  const labelScaleFactor = 1 / markerScale;

  // ----- Mutations -----
  const saveLoc = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("map_locations").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...mapLocations.map(l => l.sort_order));
        const { error } = await supabase.from("map_locations").insert({ ...payload, background_id: activeBgId, sort_order: maxOrder + 1, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-locations"] }); toast.success("Ort gespeichert"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLoc = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("map_locations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-locations"] }); toast.success("Gelöscht"); closeDialog(); },
  });

  const saveArea = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("map_areas").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("map_areas").insert({ ...payload, background_id: activeBgId, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-areas"] }); toast.success("Gebiet gespeichert"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("map_areas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-areas"] }); toast.success("Gelöscht"); closeDialog(); },
  });

  const saveDraw = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("map_drawings").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("map_drawings").insert({ ...payload, background_id: activeBgId, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-drawings"] }); toast.success("Linie gespeichert"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDraw = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("map_drawings").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-drawings"] }); toast.success("Gelöscht"); closeDialog(); },
  });

  const addBackground = useMutation({
    mutationFn: async () => {
      if (!newMapFile || !newMapName.trim()) throw new Error("Name und Bild erforderlich");
      const path = `ortskunde/${Date.now()}_${newMapFile.name}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, newMapFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const maxOrder = Math.max(0, ...backgrounds.map(b => b.sort_order));
      const { error } = await supabase.from("map_backgrounds").insert({ name: newMapName, image_url: urlData.publicUrl, sort_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-backgrounds"] }); toast.success("Karte hinzugefügt"); setNewMapName(""); setNewMapFile(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBg = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("map_backgrounds").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["map-backgrounds"] }); qc.invalidateQueries({ queryKey: ["map-locations"] }); toast.success("Karte gelöscht"); },
  });

  // ----- Helpers -----
  const closeDialog = () => {
    setEditing(null); setEditingArea(null); setEditingDraw(null);
    setPendingPos(null); setPendingArea(null); setPendingDraw(null);
    setName(""); setDesc(""); setCategory("sonstiges"); setColor(COLORS[0]); setHidden(false);
    setIconType("pin"); setIconValue("📍"); setFillOpacity(0.25); setStrokeWidth(4);
  };

  const openEditLoc = (l: MapLocation) => {
    setEditing(l); setName(l.name); setDesc(l.description || "");
    setCategory(l.category); setColor(l.color); setHidden(l.is_hidden);
    setIconType((l.icon_type as any) || "pin"); setIconValue(l.icon || "📍");
  };
  const openEditArea = (a: MapArea) => {
    setEditingArea(a); setName(a.name); setColor(a.color); setHidden(a.is_hidden);
    setCategory(a.category); setFillOpacity(Number(a.fill_opacity));
  };
  const openEditDraw = (d: MapDrawing) => {
    setEditingDraw(d); setName(d.name); setColor(d.color); setHidden(d.is_hidden);
    setStrokeWidth(d.stroke_width);
  };

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const innerX = (e.clientX - rect.left - pan.x) / zoom;
    const innerY = (e.clientY - rect.top - pan.y) / zoom;
    return { x: (innerX / rect.width) * 100, y: (innerY / rect.height) * 100 };
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (dragRef.current?.moved) return;
    if (!mode || !canEdit) return;
    const pos = getRelativePos(e);
    if (mode === "marker") {
      setPendingPos(pos); setMode(null);
    } else if (mode === "area" || mode === "draw") {
      setDrawingPoints(prev => [...prev, pos]);
    }
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 2) { toast.error("Mindestens 2 Punkte"); return; }
    if (mode === "area") { setPendingArea(drawingPoints); }
    else if (mode === "draw") { setPendingDraw(drawingPoints); }
    setDrawingPoints([]); setMode(null);
  };

  const cancelDrawing = () => { setDrawingPoints([]); setMode(null); };

  const submit = () => {
    if (editing || pendingPos) {
      if (!name.trim()) return toast.error("Name fehlt");
      const payload: any = { name, description: desc || null, category, color, is_hidden: hidden, icon: iconType === "emoji" ? iconValue : null, icon_type: iconType };
      if (editing) saveLoc.mutate({ id: editing.id, ...payload });
      else if (pendingPos) saveLoc.mutate({ ...payload, x_percent: pendingPos.x, y_percent: pendingPos.y });
    } else if (editingArea || pendingArea) {
      if (!name.trim()) return toast.error("Name fehlt");
      const payload: any = { name, color, is_hidden: hidden, fill_opacity: fillOpacity, category };
      if (editingArea) saveArea.mutate({ id: editingArea.id, ...payload });
      else if (pendingArea) saveArea.mutate({ ...payload, points: pendingArea });
    } else if (editingDraw || pendingDraw) {
      const payload: any = { name: name || "", color, is_hidden: hidden, stroke_width: strokeWidth };
      if (editingDraw) saveDraw.mutate({ id: editingDraw.id, ...payload });
      else if (pendingDraw) saveDraw.mutate({ ...payload, points: pendingDraw });
    }
  };

  // ----- Pan/zoom -----
  const onWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left; const cy = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    const newZoom = Math.min(8, Math.max(0.5, zoom * (1 + delta)));
    const ratio = newZoom / zoom;
    setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio });
    setZoom(newZoom);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (mode) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX; const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  };
  const onMouseUp = () => { setTimeout(() => { dragRef.current = null; }, 50); };

  const jumpTo = (loc: MapLocation) => {
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return;
    const newZoom = 3; setZoom(newZoom);
    setPan({
      x: rect.width / 2 - (loc.x_percent / 100) * rect.width * newZoom,
      y: rect.height / 2 - (loc.y_percent / 100) * rect.height * newZoom,
    });
  };

  // ----- Hidden password -----
  const tryUnlockHidden = async () => {
    const { data, error } = await supabase.rpc("check_map_hidden_password", { _password: hiddenPwInput });
    if (error) { toast.error(error.message); return; }
    if (data === true) {
      setHiddenUnlocked(true); setShowHiddenDialog(false); setHiddenPwInput("");
      toast.success("Versteckte Punkte freigeschaltet");
    } else toast.error("Falsches Passwort");
  };

  // Group locations by category for legend
  const grouped = useMemo(() => {
    const map = new Map<string, MapLocation[]>();
    visibleLocations.forEach(l => {
      const arr = map.get(l.category) || []; arr.push(l); map.set(l.category, arr);
    });
    return map;
  }, [visibleLocations]);

  const allCategoriesInUse = Array.from(new Set([...mapLocations.map(l => l.category), ...mapAreas.map(a => a.category)]));
  const knownCats = CATEGORIES.filter(c => allCategoriesInUse.includes(c.key));
  const customCats = allCategoriesInUse.filter(k => !CATEGORIES.some(c => c.key === k));

  const dialogOpen = !!pendingPos || !!editing || !!pendingArea || !!editingArea || !!pendingDraw || !!editingDraw;

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto map-no-helo-cursor">
      <style>{`.map-no-helo-cursor, .map-no-helo-cursor * { cursor: auto !important; }
        .map-no-helo-cursor button, .map-no-helo-cursor a, .map-no-helo-cursor [role="button"], .map-no-helo-cursor input, .map-no-helo-cursor textarea, .map-no-helo-cursor label { cursor: pointer !important; }
        .map-no-helo-cursor input, .map-no-helo-cursor textarea { cursor: text !important; }
        .map-canvas { cursor: grab; }
        .map-canvas.dragging { cursor: grabbing !important; }
        .map-canvas.placing { cursor: crosshair !important; }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Ortskunde-Karte</h1>
            <p className="text-xs text-muted-foreground">{mapLocations.length} Orte · {mapAreas.length} Gebiete · Mausrad zum Zoomen</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ort suchen..." className="pl-8 w-56" />
          </div>
          <Button variant="outline" onClick={() => hiddenUnlocked ? setHiddenUnlocked(false) : setShowHiddenDialog(true)} className="gap-1.5">
            {hiddenUnlocked ? <Eye className="w-4 h-4 text-orange-400" /> : <EyeOff className="w-4 h-4" />}
            {hiddenUnlocked ? "Versteckte aktiv" : "Versteckte Punkte"}
          </Button>
          {canEdit && (
            <>
              <Button onClick={() => { if (!activeBgId) return toast.error("Erst eine Karte wählen"); setMode("marker"); toast.info("Klicke auf die Karte"); }} className="gap-1.5" variant={mode === "marker" ? "default" : "outline"}>
                <Plus className="w-4 h-4" /> Ort
              </Button>
              <Button onClick={() => { if (!activeBgId) return toast.error("Erst eine Karte wählen"); setMode("area"); setDrawingPoints([]); toast.info("Klicke Eckpunkte des Gebiets"); }} className="gap-1.5" variant={mode === "area" ? "default" : "outline"}>
                <SquareIcon className="w-4 h-4" /> Gebiet
              </Button>
              <Button onClick={() => { if (!activeBgId) return toast.error("Erst eine Karte wählen"); setMode("draw"); setDrawingPoints([]); toast.info("Klicke Punkte für die Linie"); }} className="gap-1.5" variant={mode === "draw" ? "default" : "outline"}>
                <Pen className="w-4 h-4" /> Linie
              </Button>
            </>
          )}
          {canManageMaps && (
            <Button variant="outline" onClick={() => setShowMapsDialog(true)} className="gap-1.5">
              <MapIcon className="w-4 h-4" /> Karten
            </Button>
          )}
        </div>
      </div>

      {backgrounds.length > 0 && (
        <div className="flex gap-1 flex-wrap border-b border-border pb-1">
          {backgrounds.filter(b => b.image_url !== LIVE_MAP_URL).map((b) => (
            <button key={b.id} onClick={() => { setShowLiveMap(false); setActiveBgId(b.id); setImgAspect(null); setZoom(1); setPan({ x: 0, y: 0 }); }}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${!showLiveMap && activeBgId === b.id ? "bg-primary/15 text-primary border-b-2 border-primary -mb-[2px]" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"}`}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {showLiveMap ? (
      <div className="relative">
        <GtaVMap
          locations={searched as any}
          areas={visibleAreas as any}
          drawings={visibleDrawings as any}
          mode={mode}
          drawingPoints={drawingPoints}
          color={color}
          canEdit={canEdit}
          onMapClick={(p) => {
            if (mode === "marker") { setPendingPos(p); setMode(null); }
            else if (mode === "area" || mode === "draw") { setDrawingPoints(prev => [...prev, p]); }
          }}
          onMarkerClick={(l) => setPopupLoc(l as any)}
          onAreaClick={(a) => setPopupArea(a as any)}
          onDrawClick={(d) => { if (canEdit) openEditDraw(d as any); }}
        />
        {(mode === "area" || mode === "draw") && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card border border-border rounded shadow-lg px-3 py-2 flex gap-2 z-[1000] items-center">
            <span className="text-sm">{mode === "area" ? "Gebiet zeichnen" : "Linie zeichnen"} ({drawingPoints.length} Punkte)</span>
            <Button size="sm" onClick={finishDrawing}>Fertig</Button>
            <Button size="sm" variant="outline" onClick={cancelDrawing}>Abbrechen</Button>
          </div>
        )}
        {mode === "marker" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-sm px-3 py-1.5 rounded shadow z-[1000]">
            Klicke auf die Karte
          </div>
        )}
      </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <div
          ref={containerRef}
          className={`map-canvas relative w-full bg-card border border-border rounded-lg overflow-hidden select-none ${mode ? "placing" : ""} ${dragRef.current ? "dragging" : ""}`}
          style={imgAspect
            ? { aspectRatio: String(imgAspect), maxHeight: "82vh", margin: "0 auto" }
            : { height: "78vh" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onWheel={onWheel} onClick={handleMapClick}
        >
          <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            {activeBg ? (
              <img
                src={activeBg.image_url}
                alt={activeBg.name}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setImgAspect(img.naturalWidth / img.naturalHeight);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Keine Karte vorhanden – {canManageMaps ? 'oben "Karten" öffnen.' : "warten bis ein Admin eine hochlädt."}
              </div>
            )}

            {/* SVG overlay for areas + drawings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {visibleAreas.map(a => {
                const pts = a.points.map(p => `${p.x},${p.y}`).join(" ");
                const cx = a.points.reduce((s, p) => s + p.x, 0) / a.points.length;
                const cy = a.points.reduce((s, p) => s + p.y, 0) / a.points.length;
                return (
                  <g key={a.id}>
                    <polygon points={pts} fill={a.color} fillOpacity={a.fill_opacity}
                      stroke={a.color} strokeWidth={0.2} vectorEffect="non-scaling-stroke"
                      className={`${mode ? "pointer-events-none" : "pointer-events-auto cursor-pointer"} hover:fill-opacity-50`}
                      onClick={(e) => { if (mode) return; e.stopPropagation(); if (canEdit && (e as any).shiftKey) openEditArea(a); else setPopupArea(a); }}
                    />
                    {a.name && (
                      <g style={{ pointerEvents: "none" }}>
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                          fontSize={0.9 / labelScaleFactor} fontWeight={600} fill="#fff"
                          style={{ userSelect: "none", paintOrder: "stroke", stroke: "rgba(0,0,0,0.85)", strokeWidth: 0.35 / labelScaleFactor, strokeLinejoin: "round" }}>
                          {a.name}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {visibleDrawings.map(d => {
                const pts = d.points.map(p => `${p.x},${p.y}`).join(" ");
                return (
                  <g key={d.id} className={mode ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}
                    onClick={(e) => { if (mode) return; e.stopPropagation(); if (canEdit) openEditDraw(d); }}>
                    {d.points.length >= 3 && (
                      <polygon points={pts} fill={d.color} fillOpacity={0.2} stroke="none" />
                    )}
                    <polyline points={pts} fill="none" stroke={d.color}
                      strokeWidth={d.stroke_width} strokeOpacity={0.35}
                      strokeLinecap="round" strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke" />
                    <polyline points={pts} fill="none" stroke={d.color}
                      strokeWidth={d.stroke_width / 3} strokeLinecap="round" strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
              {/* Live drawing preview */}
              {drawingPoints.length > 0 && mode === "area" && (
                <polygon points={drawingPoints.map(p => `${p.x},${p.y}`).join(" ")} fill={color} fillOpacity={0.2}
                  stroke={color} strokeWidth={0.3} strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
              )}
              {drawingPoints.length > 0 && mode === "draw" && (
                <polyline points={drawingPoints.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color}
                  strokeWidth={1} strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
              )}
            </svg>

            {/* Markers */}
            {searched.map((loc) => (
              <button
                key={loc.id}
                onClick={(e) => { if (mode) return; e.stopPropagation(); setPopupLoc(loc); }}
                className={`absolute -translate-x-1/2 -translate-y-full ${mode ? "pointer-events-none" : ""}`}
                style={{ left: `${loc.x_percent}%`, top: `${loc.y_percent}%` }}
              >
                <div className="flex flex-col items-center" style={{ transform: `scale(${1 / labelScaleFactor})`, transformOrigin: "bottom center" }}>
                  <div className="px-1.5 py-0 rounded bg-background/95 border text-[8px] font-medium whitespace-nowrap mb-0.5 shadow-sm"
                    style={{ borderColor: loc.color, color: loc.color }}>
                    {loc.name}{loc.is_hidden && " 🔒"}
                  </div>
                  {loc.icon_type === "emoji" && loc.icon
                    ? <span className="text-base drop-shadow-md leading-none">{loc.icon}</span>
                    : <MapPin className="w-4 h-4 drop-shadow-md" style={{ color: loc.color, fill: loc.color }} />}
                </div>
              </button>
            ))}
          </div>

          {/* Drawing toolbar */}
          {mode && (mode === "area" || mode === "draw") && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card border border-border rounded shadow-lg px-3 py-2 flex gap-2 z-10 items-center">
              <span className="text-sm">{mode === "area" ? "Gebiet zeichnen" : "Linie zeichnen"} ({drawingPoints.length} Punkte)</span>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); finishDrawing(); }}>Fertig</Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); cancelDrawing(); }}>Abbrechen</Button>
            </div>
          )}
          {mode === "marker" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-sm px-3 py-1.5 rounded shadow z-10">
              Klicke auf die Karte
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-card/95 border border-border rounded-md p-1 backdrop-blur z-10">
            <button className="w-8 h-8 hover:bg-secondary rounded text-lg" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(8, z + 0.5)); }}>+</button>
            <button className="w-8 h-8 hover:bg-secondary rounded text-lg" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.5)); }}>−</button>
            <button className="w-8 h-8 hover:bg-secondary rounded text-xs" onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}>⤾</button>
          </div>

          {/* Marker popup */}
          {popupLoc && (
            <div className="absolute top-3 right-3 bg-card border border-border rounded-lg shadow-xl p-3 max-w-xs z-20">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {popupLoc.icon_type === "emoji" && popupLoc.icon
                      ? <span className="text-xl">{popupLoc.icon}</span>
                      : <MapPin className="w-5 h-5" style={{ color: popupLoc.color, fill: popupLoc.color }} />}
                    <h3 className="font-bold text-base truncate" style={{ color: popupLoc.color }}>{popupLoc.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">📁 {popupLoc.category}</p>
                  {popupLoc.description && <p className="text-xs">{popupLoc.description}</p>}
                </div>
                <button onClick={() => setPopupLoc(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => { openEditLoc(popupLoc); setPopupLoc(null); }}>Bearbeiten</Button>
              )}
            </div>
          )}
          {popupArea && (
            <div className="absolute top-3 right-3 bg-card border border-border rounded-lg shadow-xl p-3 max-w-xs z-20">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate" style={{ color: popupArea.color }}>{popupArea.name}</h3>
                  <p className="text-xs text-muted-foreground">📁 {popupArea.category}</p>
                </div>
                <button onClick={() => setPopupArea(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => { openEditArea(popupArea); setPopupArea(null); }}>Bearbeiten</Button>
              )}
            </div>
          )}
        </div>

        {/* Legend with categories */}
        <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 max-h-[78vh] overflow-y-auto">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
            <Layers className="w-4 h-4" /> Bezirke & Kategorien
          </div>
          {knownCats.concat(customCats.map(k => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), icon: "📍" }))).map(cat => {
            const inGroup = grouped.get(cat.key) || [];
            const areasInCat = visibleAreas.filter(a => a.category === cat.key);
            const total = inGroup.length + areasInCat.length;
            const isOff = categoryFilter[cat.key] === false;
            const isOpen = openCats[cat.key] ?? false;
            return (
              <Collapsible key={cat.key} open={isOpen} onOpenChange={(o) => setOpenCats(p => ({ ...p, [cat.key]: o }))}>
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded border ${isOff ? "border-border/30 opacity-50" : "border-border"} bg-background/60`}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-medium truncate">{cat.label}</span>
                    <span className="text-xs text-muted-foreground">({total})</span>
                  </CollapsibleTrigger>
                  <button onClick={() => setCategoryFilter(p => ({ ...p, [cat.key]: !(p[cat.key] === false) ? false : true }))}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${isOff ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {isOff ? "EIN" : "AUS"}
                  </button>
                </div>
                <CollapsibleContent className="pl-6 py-1 space-y-0.5">
                  {inGroup.length === 0 && areasInCat.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  {inGroup.map(l => (
                    <button key={l.id} onClick={() => jumpTo(l)} className="w-full flex items-center gap-2 text-left text-xs py-0.5 px-1 rounded hover:bg-secondary/50">
                      {l.icon_type === "emoji" && l.icon
                        ? <span>{l.icon}</span>
                        : <MapPin className="w-3 h-3" style={{ color: l.color, fill: l.color }} />}
                      <span className="truncate flex-1">{l.name}</span>
                      {l.is_hidden && <span>🔒</span>}
                    </button>
                  ))}
                  {areasInCat.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs py-0.5 px-1 text-muted-foreground">
                      <span className="w-3 h-3 rounded-sm" style={{ background: a.color, opacity: 0.7 }} />
                      <span className="truncate flex-1 italic">{a.name}</span>
                      {a.is_hidden && <span>🔒</span>}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {knownCats.length === 0 && customCats.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Einträge.</p>}
        </div>
      </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing || pendingPos ? (editing ? "Ort bearbeiten" : "Neuer Ort")
                : editingArea || pendingArea ? (editingArea ? "Gebiet bearbeiten" : "Neues Gebiet")
                : (editingDraw ? "Linie bearbeiten" : "Neue Linie")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            {(editing || pendingPos) && (
              <div><Label>Beschreibung</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
            )}
            {!(editingDraw || pendingDraw) && (
              <div>
                <Label>Kategorie</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background border border-border rounded h-9 px-2 text-sm">
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label>Farbe</Label>
              <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-foreground scale-110" : "border-transparent"} transition-transform`}
                    style={{ background: c }} />
                ))}
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded border-0 bg-transparent" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-24 h-8 text-xs font-mono" placeholder="#hex" />
              </div>
            </div>
            {(editing || pendingPos) && (
              <div>
                <Label>Symbol</Label>
                <div className="flex gap-2 mt-1.5 mb-2">
                  <button onClick={() => setIconType("pin")} className={`px-3 py-1 rounded border text-xs ${iconType === "pin" ? "border-primary bg-primary/10" : "border-border"}`}>📍 Standard-Pin</button>
                  <button onClick={() => setIconType("emoji")} className={`px-3 py-1 rounded border text-xs ${iconType === "emoji" ? "border-primary bg-primary/10" : "border-border"}`}>😀 Emoji</button>
                </div>
                {iconType === "emoji" && (
                  <>
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {EMOJI_PRESETS.map(em => (
                        <button key={em} onClick={() => setIconValue(em)}
                          className={`text-xl p-1 rounded border ${iconValue === em ? "border-primary bg-primary/10" : "border-transparent hover:border-border"}`}>{em}</button>
                      ))}
                    </div>
                    <Input value={iconValue} onChange={(e) => setIconValue(e.target.value)} maxLength={4} placeholder="Eigenes Emoji" />
                  </>
                )}
              </div>
            )}
            {(editingArea || pendingArea) && (
              <div>
                <Label>Füllung Opazität: {Math.round(fillOpacity * 100)}%</Label>
                <input type="range" min={0.1} max={0.8} step={0.05} value={fillOpacity} onChange={(e) => setFillOpacity(parseFloat(e.target.value))} className="w-full" />
              </div>
            )}
            {(editingDraw || pendingDraw) && (
              <div>
                <Label>Strichstärke: {strokeWidth}px</Label>
                <input type="range" min={1} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-full" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              Versteckt (Passwort nötig)
            </label>
          </div>
          <DialogFooter className="flex sm:justify-between">
            {(editing || editingArea || editingDraw) && canDelete ? (
              <Button variant="destructive" onClick={() => {
                if (editing) deleteLoc.mutate(editing.id);
                else if (editingArea) deleteArea.mutate(editingArea.id);
                else if (editingDraw) deleteDraw.mutate(editingDraw.id);
              }} className="gap-1.5"><Trash2 className="w-4 h-4" />Löschen</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog}>Abbrechen</Button>
              <Button onClick={submit}>Speichern</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden password dialog */}
      <Dialog open={showHiddenDialog} onOpenChange={setShowHiddenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><EyeOff className="w-5 h-5 text-orange-400" /> Versteckte Punkte anzeigen</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Passwort</Label>
            <Input type="password" value={hiddenPwInput} onChange={(e) => setHiddenPwInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryUnlockHidden()} />
            <p className="text-xs text-muted-foreground">Die jeweilige Fraktion ist für die Dokumentation und Sicherstellung des Passworts selbst verantwortlich.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHiddenDialog(false)}>Abbrechen</Button>
            <Button onClick={tryUnlockHidden}>Freischalten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maps mgmt dialog */}
      <Dialog open={showMapsDialog} onOpenChange={setShowMapsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Karten verwalten</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {backgrounds.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-2 p-2 border border-border rounded">
                  <img src={b.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                  <span className="flex-1 text-sm truncate">{b.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`"${b.name}" und alle zugehörigen Orte löschen?`)) deleteBg.mutate(b.id); }}>
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
