import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Ban } from "lucide-react";

const BewerbungssperrePage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

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
        <>
          {/* Mobile cards view */}
          <div className="md:hidden space-y-3">
            {bans?.map((b) => {
              const active = isActive(b.to_date);
              return (
                <div key={b.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{b.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      active ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {active ? "Aktiv" : "Abgelaufen"}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Von: {new Date(b.from_date).toLocaleDateString("de-DE")}</span>
                    <span>Bis: {new Date(b.to_date).toLocaleDateString("de-DE")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Grund:</span> {b.reason || "–"}
                  </p>
                  {isAdmin && (
                    <div className="flex justify-end pt-1">
                      <button onClick={() => deleteBan.mutate(b.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {bans?.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Keine Sperren vorhanden</p>
            )}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Von</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Bis</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Grund</th>
                  {isAdmin && <th className="px-4 py-3 w-16" />}
                </tr>
              </thead>
              <tbody>
                {bans?.map((b) => {
                  const active = isActive(b.to_date);
                  return (
                    <tr key={b.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(b.from_date).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(b.to_date).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          active ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {active ? "Aktiv" : "Abgelaufen"}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">{b.reason || "–"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button onClick={() => deleteBan.mutate(b.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {bans?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Keine Sperren vorhanden</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default BewerbungssperrePage;