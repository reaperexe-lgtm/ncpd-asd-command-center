import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";

const FamilienPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: gangs, isLoading } = useQuery({
    queryKey: ["gangs"],
    queryFn: async () => { const { data } = await supabase.from("gangs").select("*").order("name"); return data || []; },
  });

  const addGang = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gangs").insert({ name, location, description: desc });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gangs"] });
      toast.success("Familie hinzugefügt");
      setName(""); setLocation(""); setDesc(""); setShowForm(false);
    },
  });

  const deleteGang = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gangs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gangs"] }); toast.success("Gelöscht"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Familien</h1>
        {isAdmin && <Button variant="outline" onClick={() => setShowForm(!showForm)}>{showForm ? "Abbrechen" : "Familie hinzufügen"}</Button>}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input className="bg-input border-border" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Standort (PLZ, Gebiet)</Label><Input className="bg-input border-border" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div><Label>Erkennungsmerkmale</Label><Textarea className="bg-input border-border" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <Button onClick={() => addGang.mutate()} disabled={!name}>Speichern</Button>
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Lade...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gangs?.map((g) => (
            <div key={g.id} className="bg-card border border-border rounded-lg p-4 space-y-2 hover:border-primary/40 transition-colors">
              <div className="flex justify-between">
                <h3 className="font-bold text-primary">{g.name}</h3>
                {isAdmin && <button className="text-xs text-destructive" onClick={() => deleteGang.mutate(g.id)}>Löschen</button>}
              </div>
              {g.location && <p className="text-xs text-muted-foreground">{g.location}</p>}
              {g.description && <p className="text-sm text-secondary-foreground">{g.description}</p>}
              {g.image_url && <img src={g.image_url} alt={g.name} className="w-full aspect-video object-cover rounded-md border border-border/50" />}
            </div>
          ))}
          {gangs?.length === 0 && <p className="text-muted-foreground col-span-3">Keine Familien vorhanden.</p>}
        </div>
      )}
    </div>
  );
};

export default FamilienPage;
