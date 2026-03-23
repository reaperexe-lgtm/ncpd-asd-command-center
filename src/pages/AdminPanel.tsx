import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, UserX, Trash2, ScrollText, Filter } from "lucide-react";
import { useState, useEffect } from "react";

const ROLES = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "Alle",
  casino: "Casino",
  einsatz: "Einsatz",
  verfolgung: "Verfolgung",
  fluglizenz: "Fluglizenz",
  bewerbungssperre: "Bewerbungssperre",
  familie: "Familie/Gang",
  admin: "Admin",
  general: "Sonstiges",
};

const CATEGORY_COLORS: Record<string, string> = {
  casino: "bg-yellow-500/10 text-yellow-400",
  einsatz: "bg-red-500/10 text-red-400",
  verfolgung: "bg-blue-500/10 text-blue-400",
  fluglizenz: "bg-cyan-500/10 text-cyan-400",
  bewerbungssperre: "bg-orange-500/10 text-orange-400",
  familie: "bg-purple-500/10 text-purple-400",
  admin: "bg-primary/10 text-primary",
  general: "bg-muted text-muted-foreground",
};

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showLogs, setShowLogs] = useState(false);
  const [logFilter, setLogFilter] = useState("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || "trial_member",
      }));
    },
    enabled: isAdmin,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["activity-logs", logFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (logFilter !== "all") {
        query = query.eq("category", logFilter);
      }
      
      const { data } = await query;
      if (!data?.length) return [];

      // Fetch profile names for user_ids AND target_user_ids from details
      const userIds = [...new Set((data as any[]).map((l: any) => l.user_id))];
      const targetIds = [...new Set((data as any[]).filter((l: any) => l.details?.target_user_id).map((l: any) => l.details.target_user_id))];
      const allIds = [...new Set([...userIds, ...targetIds])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer")
        .in("id", allIds);

      return (data as any[]).map((log: any) => {
        const profile = profiles?.find((p) => p.id === log.user_id);
        const targetProfile = log.details?.target_user_id ? profiles?.find((p) => p.id === log.details.target_user_id) : null;
        return {
          ...log,
          user_name: profile?.name || "Unbekannt",
          user_dn: profile?.dienstnummer,
          target_name: targetProfile?.name || null,
          target_dn: targetProfile?.dienstnummer || null,
        };
      });
    },
    enabled: isAdmin && showLogs,
  });

  // Realtime subscription for activity logs
  useEffect(() => {
    if (!showLogs || !isAdmin) return;
    const channel = supabase
      .channel('activity-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showLogs, isAdmin, queryClient]);

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_approved: approve }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Status aktualisiert");
      logActivity(vars.approve ? "Benutzer freigeschaltet" : "Benutzer gesperrt", "admin", { target_user_id: vars.userId });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rolle aktualisiert");
      logActivity("Rolle geändert", "admin", { target_user_id: vars.userId, new_role: vars.newRole });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Anfrage gelöscht");
      logActivity("Benutzer gelöscht", "admin", { target_user_id: userId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) return <p className="text-destructive p-8">Kein Zugriff.</p>;

  const pending = users?.filter((u) => !u.is_approved) || [];
  const approved = users?.filter((u) => u.is_approved) || [];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDetails = (details: any): string => {
    if (!details || Object.keys(details).length === 0) return "";
    const parts: string[] = [];
    if (details.amount) parts.push(`$${Number(details.amount).toLocaleString()}`);
    if (details.name) parts.push(details.name);
    if (details.new_role) parts.push(`→ ${ROLE_LABELS[details.new_role] || details.new_role}`);
    if (details.location) parts.push(details.location);
    if (details.vehicle) parts.push(details.vehicle);
    if (details.plate) parts.push(details.plate);
    if (details.team) parts.push(details.team);
    if (details.category) parts.push(details.category);
    if (parts.length === 0) return JSON.stringify(details);
    return parts.join(" · ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Admin – Benutzerverwaltung</h1>
            <p className="text-xs text-muted-foreground">{users?.length || 0} Benutzer · {pending.length} ausstehend</p>
          </div>
        </div>
        <Button
          variant={showLogs ? "default" : "outline"}
          onClick={() => setShowLogs(!showLogs)}
          className="gap-2"
        >
          <ScrollText className="w-4 h-4" />
          {showLogs ? "Logs ausblenden" : "Aktivitätslog"}
        </Button>
      </div>

      {/* Activity Log Panel */}
      {showLogs && (
        <div className="bg-card border border-border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-primary">Aktivitätslog</h2>
              <span className="text-[10px] text-muted-foreground">({logs?.length || 0} Einträge)</span>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={logFilter} onValueChange={setLogFilter}>
                <SelectTrigger className="w-40 h-7 text-xs bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-primary animate-pulse text-sm">Lade Logs...</div>
              </div>
            ) : !logs?.length ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Keine Einträge vorhanden
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {logs.map((log: any) => (
                  <div key={log.id} className="px-4 py-2.5 hover:bg-primary/[0.02] transition-colors flex items-start gap-3">
                    <div className="text-[10px] text-muted-foreground font-mono w-24 shrink-0 pt-0.5 tabular-nums">
                      {formatDate(log.created_at)}
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_COLORS[log.category] || CATEGORY_COLORS.general}`}>
                      {CATEGORY_LABELS[log.category] || log.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium text-foreground">{log.user_name}</span>
                        {log.user_dn && <span className="text-muted-foreground font-mono ml-1 text-[10px]">({log.user_dn})</span>}
                        <span className="text-muted-foreground ml-1.5">—</span>
                        <span className="ml-1.5">{log.action}</span>
                      </p>
                      {log.target_name && (
                        <p className="text-[10px] text-primary mt-0.5">
                          → an <span className="font-medium">{log.target_name}</span>
                          {log.target_dn && <span className="text-muted-foreground font-mono ml-1">({log.target_dn})</span>}
                        </p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {formatDetails(log.details)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade...</div></div>
      ) : (
        <>
          {/* Pending approvals */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Ausstehende Freischaltungen ({pending.length})</h2>
              {pending.map((u) => (
                <div key={u.id} className="bg-card border border-yellow-500/20 rounded-lg px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.name || "Unbekannt"}</p>
                    <p className="text-xs text-muted-foreground">{u.dienstnummer || "Keine DN"} · {ROLE_LABELS[u.role]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r })}>
                      <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => approveMutation.mutate({ userId: u.id, approve: true })} className="gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Freischalten
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(u.id)} className="gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active users table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Dienstnummer</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Rolle</th>
                  <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((u) => (
                  <tr key={u.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium">{u.name || "–"}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.dienstnummer || "–"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Aktiv</span>
                    </td>
                    <td className="px-4 py-3">
                      <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r })}>
                        <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ userId: u.id, approve: false })} className="gap-1.5 h-7 text-xs">
                        <UserX className="w-3 h-3" /> Sperren
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
