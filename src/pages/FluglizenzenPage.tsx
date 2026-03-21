import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Plane, AlertTriangle, Clock } from "lucide-react";

const TEAMS = ["Team Red", "Team Blue", "Team Gold", "Team Silver"];
const UNITS = ["Police Academy", "Justice Division", "Public Relation", "SWAT", "IAD", "NCD", "Highway Patrol", "Air Support Division"];

const EXPIRY_MONTHS = 3;

function getExpiryDate(licenseDate: string): Date {
  const d = new Date(licenseDate);
  d.setMonth(d.getMonth() + EXPIRY_MONTHS);
  return d;
}

function getExpiryStatus(licenseDate: string): "expired" | "expiring_soon" | "active" {
  const now = new Date();
  const expiry = getExpiryDate(licenseDate);
  if (expiry <= now) return "expired";
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (expiry <= oneWeek) return "expiring_soon";
  return "active";
}

const FluglizenzenPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [team, setTeam] = useState("");
  const [unit, setUnit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterUnit, setFilterUnit] = useState<string>("all");
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

  const upsertLimit = useMutation({
    mutationFn: async ({ unitName, max }: { unitName: string; max: number }) => {
      const existing = limits?.find((l) => l.team === unitName);
      if (existing) {
        const { error } = await supabase.from("team_license_limits").update({ max_licenses: max }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_license_limits").insert({ team: unitName, max_licenses: max });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-license-limits"] });
      setEditingLimit(null);
      toast.success("Limit gespeichert");
    },
  });

  const getLimit = (unitName: string) => limits?.find((l) => l.team === unitName)?.max_licenses ?? 0;

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

  // Count per unit
  const unitCounts: Record<string, { total: number; active: number }> = {};
  UNITS.forEach((u) => { unitCounts[u] = { total: 0, active: 0 }; });
  licenses?.forEach((l) => {
    if (l.unit && unitCounts[l.unit]) {
      unitCounts[l.unit].total++;
      if (getExpiryStatus(l.license_date) !== "expired") unitCounts[l.unit].active++;
    }
  });

  const filtered = licenses?.filter((l) => filterUnit === "all" || l.unit === filterUnit) || [];

  // Sort: expired first, then expiring soon, then active
  const sorted = [...filtered].sort((a, b) => {
    const order = { expired: 0, expiring_soon: 1, active: 2 };
    const sa = order[getExpiryStatus(a.license_date)];
    const sb = order[getExpiryStatus(b.license_date)];
    if (sa !== sb) return sa - sb;
    return new Date(a.license_date).getTime() - new Date(b.license_date).getTime();
  });

  const totalActive = licenses?.filter((l) => getExpiryStatus(l.license_date) !== "expired").length || 0;

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

      {/* Unit overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {UNITS.map((u) => (
          <button
            key={u}
            onClick={() => setFilterUnit(filterUnit === u ? "all" : u)}
            className={`rounded-lg p-3 text-center transition-all duration-150 border active:scale-95
              ${filterUnit === u
                ? "bg-primary/10 border-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.1)]"
                : "bg-card border-border hover:border-primary/20"
              }`}
          >
            <p className="text-[9px] text-muted-foreground truncate leading-tight font-medium">{u}</p>
            <p className="text-primary font-bold text-lg tabular-nums mt-0.5">{unitCounts[u]?.active || 0}</p>
            {isAdmin && editingLimit === u ? (
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="text-[9px] text-muted-foreground">von</span>
                <input
                  type="number"
                  min={0}
                  className="w-10 text-center text-[11px] bg-background border border-primary/40 rounded px-1 py-0.5 text-primary tabular-nums"
                  value={editLimitValue}
                  onChange={(e) => setEditLimitValue(e.target.value)}
                  onBlur={() => upsertLimit.mutate({ unitName: u, max: parseInt(editLimitValue) || 0 })}
                  onKeyDown={(e) => { if (e.key === "Enter") upsertLimit.mutate({ unitName: u, max: parseInt(editLimitValue) || 0 }); }}
                  autoFocus
                />
              </div>
            ) : (
              <p
                className={`text-[9px] text-muted-foreground mt-0.5 ${isAdmin ? "cursor-pointer hover:text-primary" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAdmin) {
                    setEditingLimit(u);
                    setEditLimitValue(String(getLimit(u)));
                  }
                }}
              >
                von {getLimit(u)}
              </p>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-card border border-primary/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="font-semibold text-primary text-sm">Neue Fluglizenz</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Name</Label><Input className="mt-1 bg-background border-border" placeholder="Vor- und Nachname" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Ausstellungsdatum</Label><Input type="date" className="mt-1 bg-background border-border" value={date} onChange={(e) => setDate(e.target.value)} /></div>
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

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade Lizenzen...</div></div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Ausgestellt</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Ablauf</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Team</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => {
                const status = getExpiryStatus(l.license_date);
                const expiry = getExpiryDate(l.license_date);
                return (
                  <tr key={l.id} className={`border-b border-border/30 hover:bg-primary/[0.02] transition-colors ${status === "expired" ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(l.license_date).toLocaleDateString("de-DE")}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={status === "expired" ? "text-red-400" : status === "expiring_soon" ? "text-yellow-400" : "text-muted-foreground"}>
                        {expiry.toLocaleDateString("de-DE")}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{l.team}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{l.unit || "–"}</td>
                    <td className="px-4 py-3">
                      {status === "expired" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Abgelaufen
                        </span>
                      ) : status === "expiring_soon" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-500/10 text-yellow-400 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Läuft bald ab
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400">Aktiv</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => deleteLicense.mutate(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  {filterUnit !== "all" ? `Keine Lizenzen für ${filterUnit}` : "Keine Einträge vorhanden"}
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
