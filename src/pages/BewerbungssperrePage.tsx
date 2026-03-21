import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";

const BewerbungssperrePage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

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
      setName(""); setFrom(""); setTo(""); setReason("");
    },
  });

  const deleteBan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_bans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["application-bans"] }); toast.success("Gelöscht"); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Bewerbungssperren</h1>

      {isAdmin && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div><Label>Name</Label><Input className="bg-input border-border" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Von</Label><Input type="date" className="bg-input border-border" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Bis</Label><Input type="date" className="bg-input border-border" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div><Label>Grund der Ablehnung</Label><Textarea className="bg-input border-border" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => addBan.mutate()} disabled={!name || !from || !to}>Speichern</Button>
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Lade...</p> : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-primary font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Von</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Bis</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Grund</th>
                {isAdmin && <th className="px-4 py-3 text-left text-primary font-semibold">Aktionen</th>}
              </tr>
            </thead>
            <tbody>
              {bans?.map((b) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-2 text-primary">{b.name}</td>
                  <td className="px-4 py-2">{b.from_date}</td>
                  <td className="px-4 py-2">{b.to_date}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{b.reason || "–"}</td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      <Button size="sm" variant="destructive" onClick={() => deleteBan.mutate(b.id)}>Löschen</Button>
                    </td>
                  )}
                </tr>
              ))}
              {bans?.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Keine Einträge vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BewerbungssperrePage;
