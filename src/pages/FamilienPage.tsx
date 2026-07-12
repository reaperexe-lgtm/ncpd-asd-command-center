import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Users, MapPin, Upload, Bike, Skull, Home, Crosshair, Pencil, X, Check, BarChart3, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GANG_CATEGORIES } from "@/lib/gangCategories";
import { detectPrimaryAndPearl } from "@/lib/colorParser";
import { ImageCropDialog } from "@/components/ImageCropDialog";

const CATEGORIES = GANG_CATEGORIES;

type Gang = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  category: string;
  hood: string | null;
  erkennungsmerkmale: string | null;
  primary_color: string | null;
  pearl_color: string | null;
  created_at: string;
};

const FamilienPage = () => {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Familie");
  const [hood, setHood] = useState("");
  const [erkennungsmerkmale, setErkennungsmerkmale] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [pearlColor, setPearlColor] = useState("#000000");
  const [colorManuallySet, setColorManuallySet] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Gang>>({});
  const [editUploading, setEditUploading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<"week" | "month" | "all">("all");

  const { data: gangs, isLoading } = useQuery({
    queryKey: ["gangs"],
    queryFn: async () => {
      const { data } = await supabase.from("gangs").select("*").order("name");
      return (data || []) as Gang[];
    },
  });

  const { data: missionStats } = useQuery({
    queryKey: ["gang-mission-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("gang_id, created_at");
      return data || [];
    },
  });

  const addGang = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gangs").insert({
        name,
        location: location || null,
        description: desc || null,
        image_url: imageUrl || null,
        category,
        hood: hood || null,
        erkennungsmerkmale: erkennungsmerkmale || null,
        primary_color: primaryColor || "#000000",
        pearl_color: pearlColor || "#000000",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gangs"] });
      toast.success("Familie hinzugefügt");
      logActivity("Familie/Gang erstellt", "familie", { name, category });
      setName(""); setLocation(""); setDesc(""); setImageUrl(""); setCategory("Familie"); setHood(""); setErkennungsmerkmale(""); setPrimaryColor("#000000"); setPearlColor("#000000"); setColorManuallySet(false); setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateGang = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("gangs").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gangs"] });
      toast.success("Gespeichert");
      setEditingId(null);
      setEditData({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rescanColors = useMutation({
    mutationFn: async () => {
      const targets = (gangs || []).filter((g) => g.erkennungsmerkmale);
      let updated = 0;
      for (const g of targets) {
        const { primary, pearl } = detectPrimaryAndPearl(g.erkennungsmerkmale || "");
        if (!primary && !pearl) continue;
        const updates: Record<string, string> = {};
        if (primary) updates.primary_color = primary;
        if (pearl) updates.pearl_color = pearl;
        const { error } = await supabase.from("gangs").update(updates).eq("id", g.id);
        if (!error) updated++;
      }
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["gangs"] });
      toast.success(`Farberkennung abgeschlossen: ${updated} Familie(n) aktualisiert`);
      logActivity("Familien-Farben neu erkannt", "familie", { updated });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGang = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gangs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["gangs"] }); toast.success("Gelöscht"); logActivity("Familie/Gang gelöscht", "familie", { gang_id: id }); },
  });

  const uploadImage = async (file: File | Blob): Promise<string | null> => {
    if (!user) { toast.error("Nicht angemeldet"); return null; }
    const ext = file instanceof File ? file.name.split(".").pop() : (file.type === "image/jpeg" ? "jpg" : "webp");
    const path = `${user.id}/gangs-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type || undefined });
    if (error) { toast.error(`Upload fehlgeschlagen: ${error.message}`); console.error("Gang image upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleErkennungsmerkmaleChange = (value: string) => {
    setErkennungsmerkmale(value);
    if (colorManuallySet) return;
    const { primary, pearl } = detectPrimaryAndPearl(value);
    if (primary) setPrimaryColor(primary);
    if (pearl) setPearlColor(pearl);
  };

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<"create" | "edit">("create");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget("create");
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget("edit");
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropOpen(false);
    if (cropTarget === "create") {
      setUploading(true);
      const url = await uploadImage(blob);
      if (url) setImageUrl(url);
      setUploading(false);
    } else {
      setEditUploading(true);
      const url = await uploadImage(blob);
      if (url) setEditData((prev) => ({ ...prev, image_url: url }));
      setEditUploading(false);
    }
    setCropFile(null);
  };

  const removeEditImage = () => {
    setEditData({ ...editData, image_url: null });
  };

  const startEdit = (g: Gang) => {
    setEditingId(g.id);
    setEditData({
      name: g.name,
      category: g.category,
      hood: g.hood || "",
      erkennungsmerkmale: g.erkennungsmerkmale || "",
      location: g.location || "",
      description: g.description || "",
      image_url: g.image_url || null,
      primary_color: g.primary_color || "#000000",
      pearl_color: g.pearl_color || "#000000",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateGang.mutate({
      id: editingId,
      updates: {
        name: editData.name,
        category: editData.category,
        hood: editData.hood || null,
        erkennungsmerkmale: editData.erkennungsmerkmale || null,
        location: editData.location || null,
        description: editData.description || null,
        image_url: editData.image_url || null,
        primary_color: editData.primary_color || "#000000",
        pearl_color: editData.pearl_color || "#000000",
      },
    });
  };

  const filtered = gangs?.filter((g) => filterCat === "all" || g.category === filterCat) || [];

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((g) => g.category === cat.value),
  })).filter((group) => group.items.length > 0);

  const catCounts = CATEGORIES.map((c) => ({
    ...c,
    count: gangs?.filter((g) => g.category === c.value).length || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Familien</h1>
            <p className="text-xs text-muted-foreground">{gangs?.length || 0} eingetragen</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)} className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> {showStats ? "Statistik ausblenden" : "Statistik"}
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => rescanColors.mutate()} disabled={rescanColors.isPending} className="gap-1.5" title="Erkennt Primär- und Perlfarbe neu aus den Erkennungsmerkmalen aller Familien">
              <Sparkles className="w-3.5 h-3.5" /> {rescanColors.isPending ? "Erkenne Farben..." : "Farben KI-Update"}
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Hinzufügen"}
            </Button>
          )}
        </div>
      </div>

      {/* Gang Activity Statistics */}
      {showStats && gangs && missionStats && (() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const filterDate = statsPeriod === "week" ? sevenDaysAgo : statsPeriod === "month" ? thirtyDaysAgo : null;
        const filteredMissions = filterDate
          ? missionStats.filter(m => new Date(m.created_at) >= filterDate)
          : missionStats;
        
        const gangMissionCounts = gangs.map(g => {
          const count = filteredMissions.filter(m => m.gang_id === g.id).length;
          const recent = missionStats.filter(m => m.gang_id === g.id && new Date(m.created_at) >= sevenDaysAgo).length;
          return { id: g.id, name: g.name, category: g.category, total: count, recent };
        }).sort((a, b) => b.total - a.total);

        const totalMissionsWithGang = filteredMissions.filter(m => m.gang_id).length;
        const maxTotal = Math.max(...gangMissionCounts.map(g => g.total), 1);

        const getActivityLevel = (total: number, recent: number) => {
          if (total === 0) return { label: "Inaktiv", color: "text-muted-foreground", icon: Minus };
          if (recent >= 3) return { label: "Sehr aktiv", color: "text-green-400", icon: TrendingUp };
          if (recent >= 1) return { label: "Aktiv", color: "text-yellow-400", icon: TrendingUp };
          return { label: "Wenig aktiv", color: "text-red-400", icon: TrendingDown };
        };

        const chartData = gangMissionCounts.filter(g => g.total > 0).slice(0, 10);
        const BAR_COLORS = ["hsl(var(--primary))", "hsl(210 80% 60%)", "hsl(160 60% 50%)", "hsl(45 90% 55%)", "hsl(280 60% 55%)", "hsl(0 70% 55%)", "hsl(120 50% 45%)", "hsl(30 80% 55%)", "hsl(200 70% 50%)", "hsl(330 60% 55%)"];
        const periodLabels = { week: "Diese Woche", month: "Dieser Monat", all: "Gesamt" };

        return (
          <div className="bg-card border border-primary/20 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 flex-wrap">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-primary">Aktivitäts-Statistik</h2>
              <span className="text-xs text-muted-foreground ml-auto">{totalMissionsWithGang} Einsätze</span>
            </div>

            {/* Period filter */}
            <div className="flex gap-1.5">
              {(["week", "month", "all"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    statsPeriod === p
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value} Einsätze`, 'Gesamt']}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Ranking list */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {gangMissionCounts.map((g, i) => {
                const activity = getActivityLevel(g.total, g.recent);
                const ActivityIcon = activity.icon;
                const barWidth = g.total > 0 ? (g.total / maxTotal) * 100 : 0;
                const percent = totalMissionsWithGang > 0 ? ((g.total / totalMissionsWithGang) * 100).toFixed(1) : "0.0";
                return (
                  <div key={g.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{g.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-primary">{percent}%</span>
                          <ActivityIcon className={`w-3 h-3 ${activity.color}`} />
                          <span className={`text-[10px] font-medium ${activity.color}`}>{activity.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium w-16 text-right">
                          {g.total} gesamt
                        </span>
                        <span className="text-[10px] text-muted-foreground w-14 text-right">
                          {g.recent} (7T)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">30T = Einsätze der letzten 30 Tage</p>
          </div>
        );
      })()}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border active:scale-95 ${
            filterCat === "all" ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20"
          }`}
        >
          Alle ({gangs?.length || 0})
        </button>
        {catCounts.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCat(filterCat === c.value ? "all" : c.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border active:scale-95 ${
                filterCat === c.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20"
              }`}
            >
              <Icon className="w-3 h-3" />
              {c.label} ({c.count})
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-primary/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Name</Label><Input className="mt-1 bg-background border-border" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Hood / Chapter</Label><Input className="mt-1 bg-background border-border" placeholder="z.B. South LS, Paleto Bay..." value={hood} onChange={(e) => setHood(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Erkennungsmerkmale</Label><Input className="mt-1 bg-background border-border" placeholder="Farben, Kleidung, Tattoos..." value={erkennungsmerkmale} onChange={(e) => handleErkennungsmerkmaleChange(e.target.value)} /></div>
            <div><Label>Standort (alt.)</Label><Input className="mt-1 bg-background border-border" placeholder="Allgemeiner Standort" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div>
            <Label>Fahrzeug-Farben (für Einsatz-Autofill)</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">Wird automatisch aus den Erkennungsmerkmalen erkannt (1. Farbe = Primär, 2. Farbe = Perl) – manuell überschreibbar.</p>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-2">
                <Input type="color" className="w-10 h-10 p-1 rounded bg-background border-border cursor-pointer" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setColorManuallySet(true); }} />
                <span className="text-[10px] text-muted-foreground font-mono">Primär {primaryColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input type="color" className="w-10 h-10 p-1 rounded bg-background border-border cursor-pointer" value={pearlColor} onChange={(e) => { setPearlColor(e.target.value); setColorManuallySet(true); }} />
                <span className="text-[10px] text-muted-foreground font-mono">Perl {pearlColor}</span>
              </div>
              {colorManuallySet && (
                <button type="button" onClick={() => { setColorManuallySet(false); const { primary, pearl } = detectPrimaryAndPearl(erkennungsmerkmale); if (primary) setPrimaryColor(primary); if (pearl) setPearlColor(pearl); }} className="text-[10px] text-primary hover:underline">
                  Wieder automatisch erkennen
                </button>
              )}
            </div>
          </div>
          <div><Label>Beschreibung</Label><Textarea className="mt-1 bg-background border-border min-h-[80px]" placeholder="Weitere Infos..." value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div>
            <Label>Bild (optional)</Label>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md cursor-pointer hover:border-primary/40 transition-colors text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                {uploading ? "Hochladen..." : "Bild wählen"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {imageUrl && <img src={imageUrl} alt="Preview" className="w-12 h-12 rounded-md object-cover border border-border" />}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => addGang.mutate()} disabled={!name || addGang.isPending}>Speichern</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade Familien...</div></div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-primary">{group.label}</h2>
                  <span className="text-xs text-muted-foreground ml-1">({group.items.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.items.map((g) => (
                    <div key={g.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-200 group/card">
                      {editingId === g.id ? (
                        /* Edit mode image */
                        <div className="aspect-video bg-background/50 flex items-center justify-center relative">
                          {editData.image_url ? (
                            <>
                              <img src={editData.image_url} alt="" className="w-full h-full object-cover" />
                              <button onClick={removeEditImage} className="absolute top-1.5 right-1.5 bg-destructive/90 text-white rounded-full p-1 hover:bg-destructive transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <label className="flex flex-col items-center gap-1 cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                              <Upload className="w-5 h-5" />
                              <span className="text-[10px]">{editUploading ? "Hochladen..." : "Foto hinzufügen"}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} disabled={editUploading} />
                            </label>
                          )}
                          {editData.image_url && (
                            <label className="absolute bottom-1.5 right-1.5 bg-primary/90 text-white rounded-full p-1 cursor-pointer hover:bg-primary transition-colors">
                              <Upload className="w-3 h-3" />
                              <input type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} disabled={editUploading} />
                            </label>
                          )}
                        </div>
                      ) : g.image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <img src={g.image_url} alt={g.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover/card:scale-[1.02] transition-transform duration-300" />
                        </div>
                      ) : null}
                      <div className="p-3 space-y-1.5">
                        {editingId === g.id ? (
                          /* Edit mode */
                          <div className="space-y-2">
                            <Input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Name" className="h-7 text-xs bg-background border-border" />
                            <Select value={editData.category || "Familie"} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                              <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input value={editData.hood || ""} onChange={(e) => setEditData({ ...editData, hood: e.target.value })} placeholder="Hood / Chapter" className="h-7 text-xs bg-background border-border" />
                            <Input value={editData.erkennungsmerkmale || ""} onChange={(e) => {
                              const val = e.target.value;
                              setEditData((prev) => {
                                const { primary, pearl } = detectPrimaryAndPearl(val);
                                return {
                                  ...prev,
                                  erkennungsmerkmale: val,
                                  primary_color: primary || prev.primary_color,
                                  pearl_color: pearl || prev.pearl_color,
                                };
                              });
                            }} placeholder="Erkennungsmerkmale" className="h-7 text-xs bg-background border-border" />
                            <Input value={editData.location || ""} onChange={(e) => setEditData({ ...editData, location: e.target.value })} placeholder="Standort" className="h-7 text-xs bg-background border-border" />
                            <div className="flex items-center gap-3">
                              <Label className="text-[10px] shrink-0">Farben</Label>
                              <Input type="color" title="Primärfarbe" className="w-8 h-7 p-0.5 rounded bg-background border-border cursor-pointer" value={editData.primary_color || "#000000"} onChange={(e) => setEditData({ ...editData, primary_color: e.target.value })} />
                              <Input type="color" title="Perlfarbe" className="w-8 h-7 p-0.5 rounded bg-background border-border cursor-pointer" value={editData.pearl_color || "#000000"} onChange={(e) => setEditData({ ...editData, pearl_color: e.target.value })} />
                            </div>
                            <Textarea value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Beschreibung" className="text-xs bg-background border-border min-h-[50px]" />
                            <div className="flex gap-2 justify-end pt-1">
                              <button onClick={() => { setEditingId(null); setEditData({}); }} className="p-2.5 rounded-md bg-destructive/10 text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-colors"><X className="w-5 h-5" /></button>
                              <button onClick={saveEdit} className="p-2.5 rounded-md bg-primary/10 text-primary hover:text-primary/80 hover:bg-primary/20 transition-colors"><Check className="w-5 h-5" /></button>
                            </div>
                          </div>
                        ) : (
                          /* View mode */
                          <>
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-primary text-sm flex items-center gap-1.5">
                                {g.primary_color && <span className="w-2.5 h-2.5 rounded-full border border-border shrink-0" style={{ background: g.primary_color }} title="Primärfarbe" />}
                                {g.pearl_color && <span className="w-2.5 h-2.5 rounded-full border border-border shrink-0 -ml-1" style={{ background: g.pearl_color }} title="Perlfarbe" />}
                                {g.name}
                              </h3>
                              {isAdmin && (
                                <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  <button onClick={() => startEdit(g)} className="p-2 rounded-md bg-primary/10 text-muted-foreground hover:text-primary hover:bg-primary/20 transition-colors">
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => deleteGang.mutate(g.id)} className="p-2 rounded-md bg-destructive/10 text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {g.hood && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="font-medium text-foreground/70">Hood:</span> {g.hood}
                              </p>
                            )}
                            {g.location && !g.hood && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> {g.location}
                              </p>
                            )}
                            {g.erkennungsmerkmale && (
                              <p className="text-sm font-semibold text-primary/90 mt-1">
                                <span className="text-foreground/80">Merkmale:</span> {g.erkennungsmerkmale}
                              </p>
                            )}
                            {g.description && <p className="text-xs text-secondary-foreground leading-relaxed mt-1">{g.description}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Keine Familien gefunden</p>
            </div>
          )}
        </div>
      )}

      <ImageCropDialog
        file={cropFile}
        open={cropOpen}
        onOpenChange={(o) => { setCropOpen(o); if (!o) setCropFile(null); }}
        onConfirm={handleCropConfirm}
        aspect={16 / 9}
      />
    </div>
  );
};

export default FamilienPage;
