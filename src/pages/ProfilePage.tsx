import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Hash, Camera, Save, MessageCircle, Bell, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dienstnummer, setDienstnummer] = useState("");
  const [name, setName] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    top_woche: true,
    top_monat: true,
    top_me: true,
  });
  const [discordServerLink, setDiscordServerLink] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setDienstnummer(profile.dienstnummer || "");
      setImageUrl(profile.image_url || null);
    }
    // Load discord_id from DB
    if (user) {
      supabase.from("profiles").select("discord_id, discord_notifications").eq("id", user.id).single().then(({ data }) => {
        if (data?.discord_id) setDiscordId(data.discord_id);
        if (data?.discord_notifications) {
          setNotifications(data.discord_notifications as any);
        }
      });
      // Load discord server invite link
      supabase.from("permission_settings").select("role").eq("permission_key", "discord_invite_link").single().then(({ data }) => {
        if (data?.role) setDiscordServerLink(data.role);
      });
    }
  }, [profile, user]);

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
        discord_id: discordId.trim() || null,
        discord_notifications: notifications,
      } as any, { onConflict: "id" });
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

        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#5865F2]" />
            Discord ID
          </Label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={discordId} 
              onChange={(e) => setDiscordId(e.target.value)} 
              placeholder="z.B. 123456789012345678" 
              className="bg-background border-border pl-9" 
            />
          </div>
          <div className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-md p-2.5 space-y-1">
            <p className="text-[11px] text-foreground font-medium flex items-center gap-1.5">
              💡 Wozu wird die Discord ID benötigt?
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Mit deiner Discord ID kannst du den <span className="font-mono bg-muted px-1 rounded text-foreground">/topme</span> Command in Discord nutzen, um deine persönliche Wochenstatistik abzurufen.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">So findest du deine ID:</span> Discord Einstellungen → Erweitert → Entwicklermodus aktivieren → Rechtsklick auf deinen Namen → „Benutzer-ID kopieren"
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichere..." : "Profil speichern"}
        </Button>
      </div>

      {/* Discord Notifications */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#5865F2]" />
          <div>
            <h2 className="text-sm font-bold text-foreground">Discord-Benachrichtigungen</h2>
            <p className="text-[10px] text-muted-foreground">Welche Benachrichtigungen möchtest du per Discord erhalten?</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Top Woche</p>
              <p className="text-[10px] text-muted-foreground">Wöchentlicher Report der Top-Protokollschreiber</p>
            </div>
            <Switch
              checked={notifications.top_woche}
              onCheckedChange={(v) => setNotifications((n) => ({ ...n, top_woche: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Top Monat</p>
              <p className="text-[10px] text-muted-foreground">Monatlicher Report der Top-Protokollschreiber</p>
            </div>
            <Switch
              checked={notifications.top_monat}
              onCheckedChange={(v) => setNotifications((n) => ({ ...n, top_monat: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Top Me</p>
              <p className="text-[10px] text-muted-foreground">Persönliche Statistik: wie viele Protokolle du geschrieben hast</p>
            </div>
            <Switch
              checked={notifications.top_me}
              onCheckedChange={(v) => setNotifications((n) => ({ ...n, top_me: v }))}
            />
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Änderungen werden beim Speichern des Profils übernommen.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
