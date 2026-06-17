import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Hash, Camera, Save, MessageCircle, Bell, ExternalLink, Cake, PartyPopper } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dienstnummer, setDienstnummer] = useState("");
  const [internalDienstnummer, setInternalDienstnummer] = useState<string | null>(null);
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
  const [discordServerDescription, setDiscordServerDescription] = useState("");
  const [birthday, setBirthday] = useState("");
  const [asdJoinDate, setAsdJoinDate] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setDienstnummer(profile.dienstnummer || "");
      setImageUrl(profile.image_url || null);
    }
    if (user) {
      // Public profile fields
      supabase
        .from("profiles")
        .select("discord_notifications, internal_dienstnummer, asd_join_date")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if ((data as any)?.discord_notifications) {
            setNotifications((data as any).discord_notifications as any);
          }
          setInternalDienstnummer((data as any)?.internal_dienstnummer ?? null);
          if ((data as any)?.asd_join_date) setAsdJoinDate((data as any).asd_join_date);
        });
      // Private fields (own row only)
      supabase
        .from("profiles_private")
        .select("discord_id, birthday")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.discord_id) setDiscordId(data.discord_id);
          if ((data as any)?.birthday) setBirthday((data as any).birthday);
        });
      // Load discord server invite link
      supabase.from("permission_settings").select("role").eq("permission_key", "discord_invite_link").single().then(({ data }) => {
        if (data?.role) setDiscordServerLink(data.role);
      });
      // Load discord server description
      supabase.from("permission_settings").select("role").eq("permission_key", "discord_invite_description").single().then(({ data }) => {
        if (data?.role) setDiscordServerDescription(data.role);
      });
    }
  }, [profile, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
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
        discord_notifications: notifications,
        asd_join_date: asdJoinDate || null,
      } as any, { onConflict: "id" });
      if (error) throw error;

      // Persist private fields
      const { error: privErr } = await supabase
        .from("profiles_private")
        .upsert(
          {
            user_id: user.id,
            discord_id: discordId.trim() || null,
            birthday: birthday || null,
          } as any,
          { onConflict: "user_id" },
        );
      if (privErr) throw privErr;

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
          <Label className="text-xs">Interne Dienstnummer (ASD)</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              value={internalDienstnummer || ""}
              readOnly
              placeholder="Wird vom Admin vergeben"
              className="bg-background/50 border-border pl-9 font-mono text-primary cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Die interne ASD-Dienstnummer wird vom Admin im Admin-Panel vergeben.</p>
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
          {discordServerLink && (
            <div className="space-y-2">
              {discordServerDescription && (
                <div className="rounded-md border border-[#5865F2]/30 bg-[#5865F2]/5 p-3">
                  <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {discordServerDescription}
                  </p>
                </div>
              )}
              <a
                href={discordServerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md px-4 py-2.5 text-xs font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Discord-Server beitreten
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichere..." : "Profil speichern"}
        </Button>
      </div>

      {/* Geburtstag & Jubiläum */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <PartyPopper className="w-5 h-5 text-pink-400" />
          <div>
            <h2 className="text-sm font-bold text-foreground">Geburtstag & ASD-Jubiläum</h2>
            <p className="text-[10px] text-muted-foreground">Damit deine Crew dich feiern kann 🎉</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5"><Cake className="w-3.5 h-3.5 text-pink-400" /> Geburtstag</Label>
          <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="bg-background border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5"><PartyPopper className="w-3.5 h-3.5 text-purple-400" /> ASD-Beitrittsdatum</Label>
          <Input type="date" value={asdJoinDate} onChange={(e) => setAsdJoinDate(e.target.value)} className="bg-background border-border" />
          <p className="text-[10px] text-muted-foreground">Wird für Jubiläums-Reminder genutzt (z.B. „1 Jahr in der ASD")</p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full gap-2">
          <Save className="w-4 h-4" /> Speichern
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
