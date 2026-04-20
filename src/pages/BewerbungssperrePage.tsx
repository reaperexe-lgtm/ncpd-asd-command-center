import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Ban, ChevronDown, ChevronRight } from "lucide-react";

const BewerbungssperrePage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setOpenIds((p) => ({ ...p, [id]: !p[id] }));

  const { data: bans, isLoading } = useQuery({
    queryKey: ["application-bans"],
    queryFn: async () => { const { data } = await supabase.from("application_bans").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const addBan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("application_bans").insert({ name, from_date: from, to_date: to, reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application-bans"] });
      toast.success("Sperre hinzugefügt");
      logActivity("Bewerbungssperre erstellt", "bewerbungssperre", { name, from_date: from, to_date: to, reason });
      setName(""); setFrom(""); setTo(""); setReason(""); setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_bans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["application-bans"] }); toast.success("Gelöscht"); logActivity("Bewerbungssperre gelöscht", "bewerbungssperre", { ban_id: id }); },
  });

  const isActive = (toDate: string) => new Date(toDate) >= new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ban className="w-7 h-7 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Bewerbungssperren</h1>
            <p className="text-xs text-muted-foreground">
              {bans?.filter((b) => isActive(b.to_date)).length || 0} aktiv · {bans?.length || 0} gesamt
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Sperre hinzufügen"}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-destructive/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Name</Label><Input className="mt-1 bg-background border-border" placeholder="Vor- und Nachname" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Von</Label><Input type="date" className="mt-1 bg-background border-border" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Bis</Label><Input type="date" className="mt-1 bg-background border-border" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div><Label>Grund</Label><Textarea className="mt-1 bg-background border-border" placeholder="Grund der Sperre..." value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex justify-end">
            <Button variant="destructive" onClick={() => addBan.mutate()} disabled={!name || !from || !to || addBan.isPending}>Sperre speichern</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade...</div></div>
      ) : (
        <div className="space-y-3">
          {bans?.map((b) => {
            const active = isActive(b.to_date);
            const isOpen = !!openIds[b.id];
            const hasReason = !!b.reason && b.reason.trim().length > 0;
            return (
              <Collapsible key={b.id} open={isOpen} onOpenChange={() => toggle(b.id)}>
                <div className={`bg-card border rounded-lg overflow-hidden transition-colors ${
                  active ? "border-destructive/30" : "border-border"
                }`}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 flex items-center gap-3 hover:bg-primary/[0.03] transition-colors text-left">
                      <div className="shrink-0">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 md:gap-4 items-center">
                        <p className="font-semibold text-foreground truncate">{b.name}</p>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(b.from_date).toLocaleDateString("de-DE")} → {new Date(b.to_date).toLocaleDateString("de-DE")}
                        </span>
                        <span className={`justify-self-start md:justify-self-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                          active ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {active ? "Aktiv" : "Abgelaufen"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {hasReason ? (isOpen ? "Grund einklappen" : "Grund anzeigen") : "Kein Grund"}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteBan.mutate(b.id); }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded shrink-0"
                          aria-label="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-1 border-t border-border/50 ml-7">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        Grund der Sperre
                      </p>
                      {hasReason ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background/50 border border-border/50 rounded-md p-3">
                          {b.reason}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Kein Grund hinterlegt.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
          {bans?.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Keine Sperren vorhanden</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BewerbungssperrePage;
