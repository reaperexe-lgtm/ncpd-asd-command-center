import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Hash, Camera, Save } from "lucide-react";

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dienstnummer, setDienstnummer] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setDienstnummer(profile.dienstnummer || "");
      setImageUrl(profile.image_url || null);
    }
  }, [profile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `profiles/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setImageUrl(urlData.publicUrl + "?t=" + Date.now());
      toast.success("Bild hochgeladen");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: name.trim() || "Unbenannt",
        dienstnummer: dienstnummer.trim() || null,
        image_url: imageUrl,
      }, { onConflict: "id" });
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["casino-leaderboard"] }),
      ]);

      toast.success("Profil gespeichert!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <User className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Profil</h1>
          <p className="text-xs text-muted-foreground">Deine persönlichen Daten verwalten</p>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-muted-foreground/30">
                {name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <label className="absolute inset-0 rounded-full flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-6 h-6 text-primary" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          {uploading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-background/80">
              <span className="text-xs text-primary animate-pulse">Hochladen...</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Klicke auf das Bild zum Ändern</p>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs">Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background border-border pl-9" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Dienstnummer</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={dienstnummer} onChange={(e) => setDienstnummer(e.target.value)} className="bg-background border-border pl-9" />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichere..." : "Profil speichern"}
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
