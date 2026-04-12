import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Plane, AlertTriangle, Clock, Pencil, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { FlappyPlaneGame } from "@/components/FlappyPlaneGame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FluglizenzenUrkunde from "@/components/FluglizenzenUrkunde";

const TEAMS = ["Team Red", "Team Blue", "Team Gold", "Team Silver"];
const UNITS = ["Police Academy", "Justice Division", "Public Relation", "SWAT", "IAD", "NCD", "Highway Patrol", "Air Support Division", "Keine"];

const EXPIRY_MONTHS = 4;

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

type SortKey = "name" | "date" | "team" | "unit" | "status";
type SortDir = "asc" | "desc";

const TEAM_ORDER: Record<string, number> = {
  "Team Red": 0,
  "Team Blue": 1,
  "Team Gold": 2,
  "Team Silver": 3,
};

const STATUS_ORDER: Record<string, number> = {
  expired: 0,
  expiring_soon: 1,
  active: 2,
};

const FluglizenzenPage = () => {
  const { isAdmin, role } = useAuth();
  const canManageLicenses = isAdmin || ["director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [team, setTeam] = useState("");
  const [unit, setUnit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState("");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [editUnit, setEditUnit] = useState("");

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showGame, setShowGame] = useState(false);

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
      logActivity("Fluglizenz erstellt", "fluglizenz", { name, team, unit });
      setName(""); setDate(""); setTeam(""); setUnit(""); setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLicense = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name: string; license_date: string; team: string; unit: string | null } }) => {
      const { error } = await supabase.from("flight_licenses").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["flight-licenses"] });
      toast.success("Lizenz aktualisiert");
      logActivity("Fluglizenz bearbeitet", "fluglizenz", { license_id: vars.id, name: vars.updates.name });
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLicense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flight_licenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["flight-licenses"] }); toast.success("Gelöscht"); logActivity("Fluglizenz gelöscht", "fluglizenz", { license_id: id }); },
  });

  const startEditing = (l: any) => {
    setEditingId(l.id);
    setEditName(l.name);
    setEditDate(l.license_date);
    setEditTeam(l.team);
    setEditUnit(l.unit || "Keine");
  };

  const saveEdit = () => {
    if (!editingId || !editName || !editTeam) return;
    updateLicense.mutate({
      id: editingId,
      updates: {
        name: editName,
        license_date: editDate,
        team: editTeam,
        unit: editUnit === "Keine" ? null : editUnit,
      },
    });
  };

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

  // Sorting logic
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "date":
        return dir * (new Date(a.license_date).getTime() - new Date(b.license_date).getTime());
      case "team":
        return dir * ((TEAM_ORDER[a.team] ?? 99) - (TEAM_ORDER[b.team] ?? 99));
      case "unit":
        return dir * (a.unit || "").localeCompare(b.unit || "");
      case "status":
      default: {
        const sa = STATUS_ORDER[getExpiryStatus(a.license_date)];
        const sb = STATUS_ORDER[getExpiryStatus(b.license_date)];
        if (sa !== sb) return dir * (sa - sb);
        return dir * (new Date(a.license_date).getTime() - new Date(b.license_date).getTime());
      }
    }
  });

  const totalActive = licenses?.filter((l) => getExpiryStatus(l.license_date) !== "expired").length || 0;

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="w-7 h-7 text-primary cursor-pointer hover:scale-110 hover:rotate-12 transition-all duration-300" onClick={() => setShowGame(true)} />
          <div>
            <h1 className="text-2xl font-bold text-primary">Fluglizenzen</h1>
            <p className="text-xs text-muted-foreground">{totalActive} aktive Lizenzen · {licenses?.length || 0} gesamt</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          {canManageLicenses && <TabsTrigger value="certificate">Fluglizenz ausstellen</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {canManageLicenses && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Lizenz hinzufügen"}
              </Button>
            </div>
          )}

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
                {canManageLicenses && editingLimit === u ? (
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
                    className={`text-[9px] text-muted-foreground mt-0.5 ${canManageLicenses ? "cursor-pointer hover:text-primary" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canManageLicenses) {
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
            <div className="bg-card border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider hover:text-primary/80 transition-colors">
                        Name <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort("date")} className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider hover:text-primary/80 transition-colors">
                        Ausgestellt <SortIcon column="date" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Ablauf</th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort("team")} className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider hover:text-primary/80 transition-colors">
                        Team <SortIcon column="team" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort("unit")} className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider hover:text-primary/80 transition-colors">
                        Unit <SortIcon column="unit" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort("status")} className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider hover:text-primary/80 transition-colors">
                        Status <SortIcon column="status" />
                      </button>
                    </th>
                    {canManageLicenses && <th className="px-4 py-3 w-24" />}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((l) => {
                    const status = getExpiryStatus(l.license_date);
                    const expiry = getExpiryDate(l.license_date);
                    const teamBg = l.team === "Team Red" ? "bg-red-500/8" : l.team === "Team Blue" ? "bg-blue-500/8" : l.team === "Team Gold" ? "bg-yellow-500/8" : l.team === "Team Silver" ? "bg-gray-400/8" : "";
                    const teamBadge = l.team === "Team Red" ? "bg-red-500/15 text-red-400" : l.team === "Team Blue" ? "bg-blue-500/15 text-blue-400" : l.team === "Team Gold" ? "bg-yellow-500/15 text-yellow-400" : l.team === "Team Silver" ? "bg-gray-400/15 text-gray-300" : "bg-primary/10 text-primary";
                    const isEditing = editingId === l.id;

                    if (isEditing) {
                      return (
                        <tr key={l.id} className="border-b border-border/30 bg-primary/[0.04]">
                          <td className="px-4 py-2">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm bg-background border-border" />
                          </td>
                          <td className="px-4 py-2">
                            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-8 text-sm bg-background border-border" />
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs tabular-nums">
                            {getExpiryDate(editDate).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-4 py-2">
                            <Select value={editTeam} onValueChange={setEditTeam}>
                              <SelectTrigger className="h-8 text-sm bg-background border-border"><SelectValue /></SelectTrigger>
                              <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            <Select value={editUnit} onValueChange={setEditUnit}>
                              <SelectTrigger className="h-8 text-sm bg-background border-border"><SelectValue /></SelectTrigger>
                              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            {(() => {
                              const s = getExpiryStatus(editDate);
                              if (s === "expired") return <span className="text-xs text-red-400">Abgelaufen</span>;
                              if (s === "expiring_soon") return <span className="text-xs text-yellow-400">Läuft bald ab</span>;
                              return <span className="text-xs text-green-400">Aktiv</span>;
                            })()}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={saveEdit} disabled={updateLicense.isPending} className="p-1.5 rounded-md text-green-400 hover:bg-green-500/10 transition-colors active:scale-95">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={l.id} className={`border-b border-border/30 hover:bg-primary/[0.02] transition-colors ${teamBg} ${status === "expired" ? "bg-red-500/[0.04]" : ""}`}>
                        <td className="px-4 py-3 font-medium">{l.name}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(l.license_date).toLocaleDateString("de-DE")}</td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={status === "expired" ? "text-red-400" : status === "expiring_soon" ? "text-yellow-400" : "text-muted-foreground"}>
                            {expiry.toLocaleDateString("de-DE")}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${teamBadge}`}>{l.team}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{l.unit === "Keine" ? "–" : l.unit || "–"}</td>
                        <td className="px-4 py-3">
                          {status === "expired" ? (
                            <span className="text-xs px-3 py-1 rounded-full font-bold bg-red-500/20 text-red-400 border-2 border-red-500/40 inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" /> Abgelaufen
                            </span>
                          ) : status === "expiring_soon" ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-500/10 text-yellow-400 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Läuft bald ab
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400">Aktiv</span>
                          )}
                        </td>
                        {canManageLicenses && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditing(l)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors active:scale-95">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteLicense.mutate(l.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
        </TabsContent>

        {canManageLicenses && (
          <TabsContent value="certificate" className="mt-4">
            <FluglizenzenUrkunde />
          </TabsContent>
        )}
      </Tabs>

      <FlappyPlaneGame open={showGame} onOpenChange={setShowGame} />
    </div>
  );
};

export default FluglizenzenPage;
