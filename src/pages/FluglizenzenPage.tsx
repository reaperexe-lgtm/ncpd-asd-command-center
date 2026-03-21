import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Plane } from "lucide-react";

const TEAMS = ["Police Academy","Justice Division","Public Relations","S.W.A.T","I.A.D","NCD","Highway Patrol","Air Support Division"];
const UNITS = ["PA","A.S.D","SWAT","NCD","HP"];

const FluglizenzenPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [team, setTeam] = useState("");
  const [unit, setUnit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState("");

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["flight-licenses"],
    queryFn: async () => {
      const { data } = await supabase.from("flight_licenses").select("*").order("license_date", { ascending: false });
      return data || [];
    },
  });

  const { data: limits } = useQuery({
    queryKey: ["team-license-limits"],
    queryFn: async () => {
      const { data } = await supabase.from("team_license_limits").select("*");
      return data || [];
    },
  });

  const updateLimit = useMutation({
    mutationFn: async ({ teamName, max }: { teamName: string; max: number }) => {
      const { error } = await supabase.from("team_license_limits").update({ max_licenses: max }).eq("team", teamName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-license-limits"] });
      setEditingLimit(null);
      toast.success("Limit gespeichert");
    },
  });

  const getLimit = (teamName: string) => limits?.find((l) => l.team === teamName)?.max_licenses ?? 0;

  const addLicense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("flight_licenses").insert({ name, license_date: date || new Date().toISOString().split("T")[0], team, unit: unit || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-licenses"] });
      toast.success("Fluglizenz hinzugefügt");
      setName(""); setDate(""); setTeam(""); setUnit(""); setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLicense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flight_licenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["flight-licenses"] }); toast.success("Gelöscht"); },
  });

  // Team stats
  const teamCounts: Record<string, { total: number; active: number }> = {};
  TEAMS.forEach((t) => { teamCounts[t] = { total: 0, active: 0 }; });
  licenses?.forEach((l) => {
    if (teamCounts[l.team]) {
      teamCounts[l.team].total++;
      if (l.status === "Aktiv") teamCounts[l.team].active++;
    }
  });

  const filtered = licenses?.filter((l) => filterTeam === "all" || l.team === filterTeam) || [];
  const totalActive = licenses?.filter((l) => l.status === "Aktiv").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Fluglizenzen</h1>
            <p className="text-xs text-muted-foreground">{totalActive} aktive Lizenzen · {licenses?.length || 0} gesamt</p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Lizenz hinzufügen"}
          </Button>
        )}
      </div>

      {/* Team overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {TEAMS.map((t) => (
          <button
            key={t}
            onClick={() => setFilterTeam(filterTeam === t ? "all" : t)}
            className={`rounded-lg p-3 text-center transition-all duration-150 border active:scale-95
              ${filterTeam === t
                ? "bg-primary/10 border-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.1)]"
                : "bg-card border-border hover:border-primary/20"
              }`}
          >
            <p className="text-[9px] text-muted-foreground truncate leading-tight">{t}</p>
            <p className="text-primary font-bold text-lg tabular-nums mt-0.5">{teamCounts[t]?.active || 0}</p>
            {isAdmin && editingLimit === t ? (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] text-muted-foreground">von</span>
                <input
                  type="number"
                  min={0}
                  className="w-10 text-center text-[11px] bg-background border border-primary/40 rounded px-1 py-0.5 text-primary tabular-nums"
                  value={editLimitValue}
                  onChange={(e) => setEditLimitValue(e.target.value)}
                  onBlur={() => {
                    updateLimit.mutate({ teamName: t, max: parseInt(editLimitValue) || 0 });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") updateLimit.mutate({ teamName: t, max: parseInt(editLimitValue) || 0 }); }}
                  autoFocus
                />
              </div>
            ) : (
              <p
                className={`text-[9px] text-muted-foreground ${isAdmin ? "cursor-pointer hover:text-primary" : ""}`}
                onClick={() => {
                  if (isAdmin) {
                    setEditingLimit(t);
                    setEditLimitValue(String(getLimit(t)));
                  }
                }}
              >
                von {getLimit(t)}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-primary/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="font-semibold text-primary text-sm">Neue Fluglizenz</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Name</Label><Input className="mt-1 bg-background border-border" placeholder="Vor- und Nachname" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Datum</Label><Input type="date" className="mt-1 bg-background border-border" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div>
              <Label>Team</Label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Team..." /></SelectTrigger>
                <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Unit..." /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => addLicense.mutate()} disabled={!name || !team || addLicense.isPending}>Speichern</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-primary animate-pulse">Lade Lizenzen...</div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Datum</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Team</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(l.license_date).toLocaleDateString("de-DE")}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{l.team}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.unit || "–"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      l.status === "Aktiv" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => deleteLicense.mutate(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {filterTeam !== "all" ? `Keine Lizenzen für ${filterTeam}` : "Keine Einträge vorhanden"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FluglizenzenPage;
