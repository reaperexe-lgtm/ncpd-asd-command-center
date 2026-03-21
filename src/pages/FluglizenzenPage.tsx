import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

const TEAMS = ["Police Academy","Justice Division","Public Relations","S.W.A.T","I.A.D","NCD","Highway Patrol","Air Support Division"];
const UNITS = ["PA","A.S.D","SWAT","NCD","HP"];
const STATUS_COLORS: Record<string, string> = {
  Aktiv: "bg-green-700/50 text-green-300",
  Abgelaufen: "bg-red-700/50 text-red-300",
};

const FluglizenzenPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [team, setTeam] = useState("");
  const [unit, setUnit] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["flight-licenses"],
    queryFn: async () => { const { data } = await supabase.from("flight_licenses").select("*").order("license_date", { ascending: false }); return data || []; },
  });

  const addLicense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("flight_licenses").insert({ name, license_date: date, team, unit: unit || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-licenses"] });
      toast.success("Fluglizenz hinzugefügt");
      setName(""); setDate(""); setTeam(""); setUnit(""); setShowForm(false);
    },
  });

  const deleteLicense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flight_licenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["flight-licenses"] }); toast.success("Gelöscht"); },
  });

  // Count per team
  const teamCounts: Record<string, { total: number; active: number }> = {};
  TEAMS.forEach((t) => { teamCounts[t] = { total: 0, active: 0 }; });
  licenses?.forEach((l) => {
    if (teamCounts[l.team]) {
      teamCounts[l.team].total++;
      if (l.status === "Aktiv") teamCounts[l.team].active++;
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Fluglizenzen</h1>

      {/* Team overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {TEAMS.map((t) => (
          <div key={t} className="bg-card border border-border rounded-md p-2 text-center">
            <p className="text-[10px] text-muted-foreground truncate">{t}</p>
            <p className="text-primary font-bold tabular-nums">{teamCounts[t]?.active || 0}/{teamCounts[t]?.total || 0}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {isAdmin && (
        <>
          {!showForm && <Button variant="outline" onClick={() => setShowForm(true)}>Lizenz hinzufügen</Button>}
          {showForm && (
            <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-4 gap-3 items-end">
              <div><Label>Name</Label><Input className="bg-input border-border" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Datum</Label><Input type="date" className="bg-input border-border" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div>
                <Label>Team</Label>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Team auswählen" /></SelectTrigger>
                  <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Unit auswählen" /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-4 flex gap-2 justify-end">
                <Button onClick={() => addLicense.mutate()} disabled={!name || !team}>Speichern</Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>Abbrechen</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Table */}
      {isLoading ? <p className="text-muted-foreground">Lade...</p> : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-primary font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Datum</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Team</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Unit</th>
                <th className="px-4 py-3 text-left text-primary font-semibold">Status</th>
                {isAdmin && <th className="px-4 py-3 text-left text-primary font-semibold">Aktionen</th>}
              </tr>
            </thead>
            <tbody>
              {licenses?.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-2 text-primary">{l.name}</td>
                  <td className="px-4 py-2">{l.license_date}</td>
                  <td className="px-4 py-2"><span className="text-xs bg-secondary px-2 py-0.5 rounded">{l.team}</span></td>
                  <td className="px-4 py-2">{l.unit || "–"}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[l.status] || "bg-secondary"}`}>{l.status}</span></td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      <Button size="sm" variant="destructive" onClick={() => deleteLicense.mutate(l.id)}>Löschen</Button>
                    </td>
                  )}
                </tr>
              ))}
              {licenses?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Keine Einträge vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FluglizenzenPage;
