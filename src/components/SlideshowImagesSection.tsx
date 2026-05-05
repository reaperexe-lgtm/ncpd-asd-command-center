import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

interface SlideshowImage {
  id: string;
  image_url: string;
  name: string | null;
  sort_order: number;
  is_active: boolean;
}

const SlideshowImagesSection = () => {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: images = [] } = useQuery({
    queryKey: ["slideshow-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slideshow_images")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as SlideshowImage[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Bitte ein Bild auswählen");
      const ext = file.name.split(".").pop() || "png";
      const path = `slideshow/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const maxOrder = Math.max(0, ...images.map((i) => i.sort_order));
      const { error } = await supabase.from("slideshow_images").insert({
        image_url: urlData.publicUrl,
        name: name || file.name,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slideshow-images"] });
      toast.success("Bild hinzugefügt");
      setName("");
      setFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("slideshow_images").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slideshow-images"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("slideshow_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slideshow-images"] });
      toast.success("Bild entfernt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hintergrund-Slideshow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 p-4 rounded-lg border border-border">
          <Label>Neues Hintergrundbild hinzufügen</Label>
          <Input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!file || addMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            Hochladen
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={img.image_url} alt={img.name ?? ""} className="w-full h-32 object-cover" />
              <div className="p-2 bg-card space-y-2">
                <div className="text-xs truncate">{img.name}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={img.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: img.id, is_active: v })}
                    />
                    <span className="text-xs">{img.is_active ? "Aktiv" : "Aus"}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Bild wirklich entfernen?")) deleteMutation.mutate(img.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {images.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground text-center py-6">
              Noch keine zusätzlichen Bilder. Standard-Hintergründe sind aktiv.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SlideshowImagesSection;