import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Users, MapPin, Upload } from "lucide-react";

const FamilienPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: gangs, isLoading } = useQuery({
    queryKey: ["gangs"],
    queryFn: async () => { const { data } = await supabase.from("gangs").select("*").order("name"); return data || []; },
  });

  const addGang = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gangs").insert({ name, location: location || null, description: desc || null, image_url: imageUrl || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gangs"] });
      toast.success("Familie hinzugefügt");
      setName(""); setLocation(""); setDesc(""); setImageUrl(""); setShowForm(false);
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
            <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Familie hinzufügen"}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-primary/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Name</Label><Input className="mt-1 bg-background border-border" placeholder="Familienname" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Standort / Gebiet</Label><Input className="mt-1 bg-background border-border" placeholder="z.B. South LS, Paleto..." value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div><Label>Erkennungsmerkmale / Beschreibung</Label><Textarea className="mt-1 bg-background border-border min-h-[80px]" placeholder="Farben, Fahrzeuge, Merkmale..." value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
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
        <div className="flex justify-center py-12">
          <div className="text-primary animate-pulse">Lade Familien...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gangs?.map((g) => (
            <div key={g.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-200 group">
              {g.image_url && (
                <div className="aspect-video overflow-hidden">
                  <img src={g.image_url} alt={g.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-primary text-lg">{g.name}</h3>
                  {isAdmin && (
                    <button onClick={() => deleteGang.mutate(g.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {g.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {g.location}
                  </p>
                )}
                {g.description && <p className="text-sm text-secondary-foreground leading-relaxed">{g.description}</p>}
              </div>
            </div>
          ))}
          {gangs?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Keine Familien eingetragen</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FamilienPage;
