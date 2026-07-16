import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/lib/supabaseFunctions";
import { logActivity } from "@/lib/activityLog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, ShieldAlert } from "lucide-react";

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MeldeaufforderungPage = () => {
  const { role, user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isDirection = role === "director" || role === "co_director" || role === "supervisor";

  const [showForm, setShowForm] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [notiz, setNotiz] = useState("");

  const { data: members } = useQuery({
    queryKey: ["meldeaufforderung-members"],
    enabled: isDirection,
    queryFn: async () => {
      const [{ data: profiles }, { data: priv }] = await Promise.all([
        supabase.from("profiles").select("id, name, dienstnummer, internal_dienstnummer").eq("is_approved", true).order("name"),
        supabase.from("profiles_private").select("user_id, discord_id"),
      ]);
      const discordMap: Record<string, string> = {};
      for (const p of priv || []) if (p.discord_id) discordMap[p.user_id] = p.discord_id;
      return (profiles || []).map((p) => ({ ...p, discord_id: discordMap[p.id] ?? null }));
    },
  });

  const { data: ownDiscordId } = useQuery({
    queryKey: ["meldeaufforderung-own-discord", user?.id],
    enabled: isDirection && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles_private").select("discord_id").eq("user_id", user!.id).maybeSingle();
      return data?.discord_id ?? null;
    },
  });

  const { data: meldungen, isLoading } = useQuery({
    queryKey: ["meldeaufforderungen"],
    enabled: isDirection,
    queryFn: async () => {
      const { data, error } = await supabase.from("meldeaufforderungen").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setTargetUserId(""); setContactIds([]); setNotiz("");
    setShowForm(false);
  };

  const toggleContact = (id: string) => {
    setContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const sendMeldung = useMutation({
    mutationFn: async () => {
      const target = members?.find((m) => m.id === targetUserId);
      if (!target) throw new Error("Bitte ein Mitglied auswählen");
      if (contactIds.length === 0) throw new Error("Bitte mindestens einen Ansprechpartner auswählen");

      const contacts = contactIds
        .map((id) => members?.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m) => ({
          user_id: m.id,
          name: m.name,
          discord_id: m.discord_id,
          internal_dienstnummer: m.internal_dienstnummer,
        }));

      const { data, error } = await supabase
        .from("meldeaufforderungen")
        .insert({
          target_user_id: target.id,
          target_name: target.name,
          target_dienstnummer: target.dienstnummer,
          target_discord_id: target.discord_id,
          contacts,
          notiz: notiz || null,
          issued_by: user!.id,
          issued_by_name: profile?.name || "Direction",
          issued_by_discord_id: ownDiscordId || null,
        })
        .select()
        .single();
      if (error) throw error;

      try {
        await invokeEdgeFunction(supabase, "discord-send-meldeaufforderung", { meldeaufforderung_id: data.id });
      } catch (e: any) {
        toast.error(`Meldeaufforderung gespeichert, aber Discord-Versand fehlgeschlagen: ${e.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meldeaufforderungen"] });
      toast.success("Meldeaufforderung gesendet");
      logActivity("Meldeaufforderung gesendet", "meldung", { meldeaufforderung_id: data.id, target: data.target_name });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMeldung = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meldeaufforderungen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["meldeaufforderungen"] });
      toast.success("Gelöscht");
      logActivity("Meldeaufforderung gelöscht", "meldung", { meldeaufforderung_id: id });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isDirection) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Kein Zugriff</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Dieser Bereich ist ausschließlich der Direction (Director / Co-Director / Supervisor) vorbehalten.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Meldeaufforderung</h1>
            <p className="text-xs text-muted-foreground">{meldungen?.length ?? 0} versendet</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Meldeaufforderung senden"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-destructive/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div>
            <Label>Mitarbeiter/in</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger className="mt-1.5 bg-background border-border"><SelectValue placeholder="Mitglied auswählen..." /></SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}{m.dienstnummer ? ` (#${m.dienstnummer})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ansprechpartner (einer oder mehrere)</Label>
            <div className="mt-1.5 max-h-52 overflow-y-auto border border-border rounded-md bg-background divide-y divide-border/50">
              {members?.map((m) => (
                <label key={m.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-primary/[0.03] transition-colors">
                  <Checkbox checked={contactIds.includes(m.id)} onCheckedChange={() => toggleContact(m.id)} />
                  <span className="text-foreground">
                    {m.internal_dienstnummer && <span className="text-primary font-mono font-semibold mr-1.5">[{m.internal_dienstnummer}]</span>}
                    {m.name}{m.dienstnummer ? ` (#${m.dienstnummer})` : ""}
                  </span>
                </label>
              ))}
              {(!members || members.length === 0) && (
                <p className="text-center text-muted-foreground py-4 text-sm">Keine Mitglieder gefunden.</p>
              )}
            </div>
          </div>

          <div>
            <Label>Notiz (optional)</Label>
            <Textarea className="mt-1.5 bg-background border-border" placeholder="Interner Hinweis, warum die Meldung erforderlich ist..." value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          </div>

          <p className="text-xs text-muted-foreground">
            Die Meldeaufforderung wird automatisch in den Discord-Channel gepostet, das Mitglied sowie alle ausgewählten Ansprechpartner werden dabei gepingt. Die Notiz wird zusätzlich in den Begründungs-Channel gepostet.
          </p>

          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => sendMeldung.mutate()}
              disabled={sendMeldung.isPending || !targetUserId || contactIds.length === 0}
            >
              Meldeaufforderung senden
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade...</div></div>
      ) : (
        <div className="space-y-3">
          {(meldungen || []).map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {m.target_name}{m.target_dienstnummer ? ` (#${m.target_dienstnummer})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(m.created_at)} · von {m.issued_by_name}</p>
                </div>
                <button
                  onClick={() => deleteMeldung.mutate(m.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded shrink-0"
                  aria-label="Löschen"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/70">Ansprechpartner:</span>{" "}
                {(Array.isArray(m.contacts) ? m.contacts : []).map((c: any, i: number) => (
                  <span key={i}>
                    {i > 0 && ", "}
                    {c.internal_dienstnummer ? `[${c.internal_dienstnummer}] ` : ""}{c.name}
                  </span>
                ))}
              </p>
              {m.notiz && (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background/50 border border-border/50 rounded-md p-3">
                  {m.notiz}
                </p>
              )}
            </div>
          ))}
          {(!meldungen || meldungen.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Noch keine Meldeaufforderungen versendet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MeldeaufforderungPage;
