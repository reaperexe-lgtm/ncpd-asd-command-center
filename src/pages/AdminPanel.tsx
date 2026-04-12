import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, UserCheck, UserX, Trash2, ScrollText, Filter, CheckCircle, XCircle, Clock, Bell, MessageCircle, Lock, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import PermissionMatrixSection from "@/components/PermissionMatrixSection";

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

const RESET_TYPE_LABELS: Record<string, string> = {
  weekly: "Wochenstatistik",
  monthly: "Monatsstatistik",
  pursuits: "10-80 Verfolgungen",
  overview: "Übersicht",
  all: "Alle Statistiken",
};

const AdminPanel = () => {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [logFilter, setLogFilter] = useState("all");
  const [editingDiscord, setEditingDiscord] = useState<Record<string, string>>({});

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
    enabled: isAdmin && activeTab === "logs",
  });

  const { data: resetRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["reset-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reset_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      
      const ids = [...new Set(data.map((r: any) => r.requested_by).filter(Boolean))];
      const reviewerIds = [...new Set(data.map((r: any) => r.reviewed_by).filter(Boolean))];
      const allIds = [...new Set([...ids, ...reviewerIds])];
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", allIds);
      
      return data.map((r: any) => ({
        ...r,
        requester_name: profiles?.find((p) => p.id === r.requested_by)?.name || "Unbekannt",
        reviewer_name: r.reviewed_by ? profiles?.find((p) => p.id === r.reviewed_by)?.name || "Unbekannt" : null,
      }));
    },
    enabled: isAdmin,
  });

  const pendingRequestCount = resetRequests?.filter((r: any) => r.status === "pending").length || 0;

  // Realtime: activity logs
  useEffect(() => {
    if (activeTab !== "logs" || !isAdmin) return;
    const channel = supabase
      .channel('activity-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab, isAdmin, queryClient]);

  // Realtime: notify admin on new reset requests
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('reset-requests-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reset_requests' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["reset-requests"] });
        toast.info("📩 Neue Reset-Anfrage eingegangen!", {
          description: `Typ: ${RESET_TYPE_LABELS[(payload.new as any)?.reset_type] || "Unbekannt"}`,
          duration: 8000,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, queryClient]);

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
        if (error) throw error;
      } else {
        // Reject = delete user completely so name/dienstnummer become available again
        const { data, error } = await supabase.functions.invoke("delete-user", {
          body: { userId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(vars.approve ? "Benutzer freigeschaltet" : "Benutzer abgelehnt und gelöscht");
      logActivity(vars.approve ? "Benutzer freigeschaltet" : "Benutzer abgelehnt und gelöscht", "admin", { target_user_id: vars.userId });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole, oldRole }: { userId: string; newRole: string; oldRole: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rolle aktualisiert");
      const targetName = users?.find(u => u.id === vars.userId)?.name || "Unbekannt";
      logActivity(`Rolle geändert: ${ROLE_LABELS[vars.oldRole] || vars.oldRole} → ${ROLE_LABELS[vars.newRole] || vars.newRole}`, "admin", { 
        target_user_id: vars.userId,
        target_name: targetName,
        old_role: vars.oldRole,
        new_role: vars.newRole 
      });
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

  const discordMutation = useMutation({
    mutationFn: async ({ userId, discordId }: { userId: string; discordId: string }) => {
      const { error } = await supabase.from("profiles").update({ discord_id: discordId.trim() || null } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Discord-ID gespeichert");
      setEditingDiscord((prev) => { const next = { ...prev }; delete next[vars.userId]; return next; });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleResetRequest = useMutation({
    mutationFn: async ({ requestId, approve, request }: { requestId: string; approve: boolean; request: any }) => {
      const { error } = await supabase
        .from("reset_requests")
        .update({ 
          status: approve ? "approved" : "rejected", 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        } as any)
        .eq("id", requestId);
      if (error) throw error;

      if (approve) {
        const resetType = request.reset_type;
        if (resetType === "all") {
          const now = new Date().toISOString();
          await supabase.from("stats_resets").insert([
            { reset_type: "weekly", reset_by: request.requested_by, reset_at: now },
            { reset_type: "monthly", reset_by: request.requested_by, reset_at: now },
            { reset_type: "pursuits", reset_by: request.requested_by, reset_at: now },
            { reset_type: "overview", reset_by: request.requested_by, reset_at: now },
          ] as any);
        } else {
          await supabase.from("stats_resets").insert({ 
            reset_type: resetType, 
            reset_by: request.requested_by 
          } as any);
        }
        logActivity(`Reset genehmigt: ${RESET_TYPE_LABELS[resetType] || resetType}`, "admin", {
          target_user_id: request.requested_by,
          reset_type: resetType,
          reason: request.reason,
        });
      } else {
        logActivity(`Reset abgelehnt: ${RESET_TYPE_LABELS[request.reset_type] || request.reset_type}`, "admin", {
          target_user_id: request.requested_by,
          reset_type: request.reset_type,
          reason: request.reason,
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reset-requests"] });
      queryClient.invalidateQueries({ queryKey: ["stats-resets"] });
      toast.success(vars.approve ? "Reset genehmigt und durchgeführt" : "Reset abgelehnt");
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
    if (details.target_name) parts.push(details.target_name);
    if (details.old_role && details.new_role) {
      parts.push(`${ROLE_LABELS[details.old_role] || details.old_role} → ${ROLE_LABELS[details.new_role] || details.new_role}`);
    } else if (details.new_role) {
      parts.push(`→ ${ROLE_LABELS[details.new_role] || details.new_role}`);
    }
    if (details.reset_type) parts.push(RESET_TYPE_LABELS[details.reset_type] || details.reset_type);
    if (details.reason) parts.push(`Grund: ${details.reason}`);
    if (details.location) parts.push(details.location);
    if (details.vehicle) parts.push(details.vehicle);
    if (details.plate) parts.push(details.plate);
    if (details.team) parts.push(details.team);
    if (details.category && !details.old_role) parts.push(details.category);
    if (parts.length === 0) return JSON.stringify(details);
    return parts.join(" · ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Admin-Bereich</h1>
          <p className="text-xs text-muted-foreground">{users?.length || 0} Benutzer · {pending.length} ausstehend</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Benutzer
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" /> Rechte
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <ScrollText className="w-3.5 h-3.5" /> Aktivität
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5 text-xs relative">
            <Bell className="w-3.5 h-3.5" /> Anfragen
            {pendingRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {pendingRequestCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade...</div></div>
          ) : (
            <div className="space-y-6">
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Ausstehende Freischaltungen ({pending.length})</h2>
                  {pending.map((u) => (
                    <div key={u.id} className="bg-card border border-yellow-500/20 rounded-lg px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{u.name || "Unbekannt"}</p>
                          <p className="text-xs text-muted-foreground">{u.dienstnummer || "Keine DN"} · {ROLE_LABELS[u.role]}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })}>
                          <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => approveMutation.mutate({ userId: u.id, approve: true })} className="gap-1.5 h-8 text-xs">
                          <UserCheck className="w-3.5 h-3.5" /> Freischalten
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(u.id)} className="gap-1.5 h-8 text-xs">
                          <Trash2 className="w-3.5 h-3.5" /> Löschen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* User cards for mobile, table for desktop */}
              <div className="md:hidden space-y-3">
                {approved.map((u) => (
                  <div key={u.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.name || "–"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{u.dienstnummer || "–"}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Aktiv</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-[#5865F2] shrink-0" />
                      <Input
                        value={editingDiscord[u.id] ?? u.discord_id ?? ""}
                        onChange={(e) => setEditingDiscord({ ...editingDiscord, [u.id]: e.target.value })}
                        placeholder="Discord ID"
                        className="h-7 text-xs bg-background border-border flex-1"
                      />
                      {editingDiscord[u.id] !== undefined && editingDiscord[u.id] !== (u.discord_id ?? "") && (
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => discordMutation.mutate({ userId: u.id, discordId: editingDiscord[u.id] })}>
                          ✓
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })}>
                        <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ userId: u.id, approve: false })} className="gap-1.5 h-7 text-xs">
                        <UserX className="w-3 h-3" /> Sperren
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Dienstnummer</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Discord ID</th>
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
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={editingDiscord[u.id] ?? u.discord_id ?? ""}
                              onChange={(e) => setEditingDiscord({ ...editingDiscord, [u.id]: e.target.value })}
                              placeholder="Discord ID eingeben"
                              className="h-7 text-xs bg-background border-border w-44"
                            />
                            {editingDiscord[u.id] !== undefined && editingDiscord[u.id] !== (u.discord_id ?? "") && (
                              <Button size="sm" className="h-7 text-xs px-2" onClick={() => discordMutation.mutate({ userId: u.id, discordId: editingDiscord[u.id] })}>
                                ✓
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Aktiv</span>
                        </td>
                        <td className="px-4 py-3">
                          <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })}>
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
              </div>
            </div>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <PermissionMatrixSection approved={approved} roleMutation={roleMutation} />
        </TabsContent>


        <TabsContent value="logs">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
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

            <div className="max-h-[500px] overflow-y-auto">
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
                    <div key={log.id} className="px-4 py-2.5 hover:bg-primary/[0.02] transition-colors flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                      <div className="text-[10px] text-muted-foreground font-mono w-24 shrink-0 pt-0.5 tabular-nums">
                        {formatDate(log.created_at)}
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 w-fit ${CATEGORY_COLORS[log.category] || CATEGORY_COLORS.general}`}>
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
        </TabsContent>

        {/* Reset Requests Tab */}
        <TabsContent value="requests">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Reset-Anfragen
            </h2>
            {requestsLoading ? (
              <div className="flex justify-center py-8"><div className="text-primary animate-pulse text-sm">Lade...</div></div>
            ) : !resetRequests?.length ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-card border border-border rounded-lg">
                Keine Anfragen vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {resetRequests.map((req: any) => (
                  <div key={req.id} className={`bg-card border rounded-lg p-4 space-y-2 ${
                    req.status === "pending" ? "border-yellow-500/30" : 
                    req.status === "approved" ? "border-green-500/20" : "border-red-500/20"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                          req.status === "approved" ? "bg-green-500/10 text-green-400" :
                          "bg-red-500/10 text-red-400"
                        }`}>
                          {req.status === "pending" ? "⏳ Ausstehend" : req.status === "approved" ? "✅ Genehmigt" : "❌ Abgelehnt"}
                        </span>
                        <span className="text-xs font-medium text-primary">{RESET_TYPE_LABELS[req.reset_type] || req.reset_type}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatDate(req.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Von:</span> {req.requester_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Grund:</span> {req.reason}
                    </p>
                    {req.reviewer_name && (
                      <p className="text-[10px] text-muted-foreground">
                        {req.status === "approved" ? "Genehmigt" : "Abgelehnt"} von {req.reviewer_name} am {formatDate(req.reviewed_at)}
                      </p>
                    )}
                    {req.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button 
                          size="sm" 
                          className="gap-1.5 h-7 text-xs" 
                          onClick={() => handleResetRequest.mutate({ requestId: req.id, approve: true, request: req })}
                          disabled={handleResetRequest.isPending}
                        >
                          <CheckCircle className="w-3 h-3" /> Genehmigen
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => handleResetRequest.mutate({ requestId: req.id, approve: false, request: req })}
                          disabled={handleResetRequest.isPending}
                        >
                          <XCircle className="w-3 h-3" /> Ablehnen
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;