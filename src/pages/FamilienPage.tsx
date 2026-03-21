import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Users, MapPin, Upload, Bike, Skull, Home, Crosshair } from "lucide-react";

const CATEGORIES = [
  { value: "Street Gang", label: "Street Gang", icon: Skull },
  { value: "Familie", label: "Familie", icon: Home },
  { value: "Kartell", label: "Kartell", icon: Crosshair },
  { value: "Biker Club", label: "Biker Club", icon: Bike },
] as const;

const FamilienPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Familie");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: gangs, isLoading } = useQuery({
    queryKey: ["gangs"],
    queryFn: async () => {
      const { data } = await supabase.from("gangs").select("*").order("name");
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gangs"] });
      toast.success("Familie hinzugefügt");
      setName(""); setLocation(""); setDesc(""); setImageUrl(""); setCategory("Familie"); setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGang = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gangs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gangs"] }); toast.success("Gelöscht"); },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `gangs/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) { toast.error("Upload fehlgeschlagen"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
  };

  const filtered = gangs?.filter((g) => filterCat === "all" || (g as any).category === filterCat) || [];

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((g) => (g as any).category === cat.value),
  })).filter((group) => filterCat === "all" ? group.items.length > 0 : group.items.length >= 0);

  const catCounts = CATEGORIES.map((c) => ({
    ...c,
    count: gangs?.filter((g) => (g as any).category === c.value).length || 0,
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
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Hinzufügen"}
          </Button>
        )}
      </div>

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

      {showForm && (
        <div className="bg-card border border-primary/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Name</Label><Input className="mt-1 bg-background border-border" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Standort / Gebiet</Label><Input className="mt-1 bg-background border-border" placeholder="z.B. South LS..." value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div>
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Beschreibung</Label><Textarea className="mt-1 bg-background border-border min-h-[80px]" placeholder="Farben, Fahrzeuge, Merkmale..." value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
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
          {grouped.filter((g) => g.items.length > 0).map((group) => {
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
                    <div key={g.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-200 group">
                      {g.image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img src={g.image_url} alt={g.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                        </div>
                      )}
                      <div className="p-3 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-primary text-sm">{g.name}</h3>
                          {isAdmin && (
                            <button onClick={() => deleteGang.mutate(g.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {g.location && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {g.location}
                          </p>
                        )}
                        {g.description && <p className="text-xs text-secondary-foreground leading-relaxed">{g.description}</p>}
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
    </div>
  );
};

export default FamilienPage;
