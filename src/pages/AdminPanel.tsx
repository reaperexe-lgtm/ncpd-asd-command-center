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
import { Shield, UserCheck, UserX, Trash2, ScrollText, Filter, CheckCircle, XCircle, Clock, Bell, MessageCircle, Lock, Check, X, Ban, Unlock, Settings, ExternalLink, Hash, Plane, Megaphone, Calendar, Send, UserPlus, Activity, LifeBuoy, Trophy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import PermissionMatrixSection from "@/components/PermissionMatrixSection";
import AchievementsManager from "@/components/AchievementsManager";

const ROLES = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member", "flight_license"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
  flight_license: "Fluglizenz",
};

// Hierarchie: niedrigerer Index = höherer Rang
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 0, director: 1, co_director: 2, supervisor: 3,
  ausbilder: 4, trial_ausbilder: 5, member: 6, trial_member: 7, flight_license: 7,
};

/**
 * Liefert die Rollen, die ein User mit `currentRole` neu zuweisen darf.
 * Director/Co-Director dürfen nur Rollen unter dem eigenen Rang.
 * Co-Director darf seinen eigenen Rang nicht vergeben.
 */
function getAssignableRoles(currentRole: string | null): readonly string[] {
  if (!currentRole) return [];
  if (currentRole === "admin") return ROLES;
  const myLevel = ROLE_HIERARCHY[currentRole] ?? 999;
  return ROLES.filter((r) => (ROLE_HIERARCHY[r] ?? 999) > myLevel);
}

function canEditUser(currentRole: string | null, targetRole: string): boolean {
  if (!currentRole) return false;
  if (currentRole === "admin") return true;
  const myLevel = ROLE_HIERARCHY[currentRole] ?? 999;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 999;
  return targetLevel > myLevel;
}

/** Sortiert Mitglieder nach Rang-Hierarchie, dann nach interner DN (numerisch). */
function sortByRankAndDn<T extends { role: string; internal_dienstnummer?: string | null; name?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const rankDiff = (ROLE_HIERARCHY[a.role] ?? 999) - (ROLE_HIERARCHY[b.role] ?? 999);
    if (rankDiff !== 0) return rankDiff;
    const aNum = parseInt(((a.internal_dienstnummer || "").match(/\d+/)?.[0]) || "9999", 10);
    const bNum = parseInt(((b.internal_dienstnummer || "").match(/\d+/)?.[0]) || "9999", 10);
    if (aNum !== bNum) return aNum - bNum;
    return (a.name || "").localeCompare(b.name || "");
  });
}

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
  pursuits: "10-80 Verfolgungen (Woche)",
  pursuits_monthly: "10-80 Verfolgungen (Monat)",
  overview: "Übersicht / Einsätze nach Raubart",
  all: "Alle Statistiken",
};

const AdminPanel = () => {
  const { isAdmin, user, role: currentUserRole } = useAuth();
  const assignableRoles = getAssignableRoles(currentUserRole);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [logFilter, setLogFilter] = useState("all");
  const [editingDiscord, setEditingDiscord] = useState<Record<string, string>>({});
  const [editingInternalDn, setEditingInternalDn] = useState<Record<string, string>>({});
  const [discordInviteLink, setDiscordInviteLink] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [discordInviteDescription, setDiscordInviteDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [aufstellungAt, setAufstellungAt] = useState("");
  const [aufstellungOrt, setAufstellungOrt] = useState("Vespucci Police Department Dach");
  const [aufstellungAuto, setAufstellungAuto] = useState(true);
  const [savingAufstellung, setSavingAufstellung] = useState(false);
  const [sendingAufstellung, setSendingAufstellung] = useState(false);
  const [statsPingDirector, setStatsPingDirector] = useState("");
  const [statsPingCoDirector, setStatsPingCoDirector] = useState("");
  const [savingStatsPings, setSavingStatsPings] = useState(false);
  const [srMaxAttempts, setSrMaxAttempts] = useState("3");
  const [savingSrAttempts, setSavingSrAttempts] = useState(false);

  // Load discord invite link
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("permission_settings").select("role").eq("permission_key", "discord_invite_link").single().then(({ data }) => {
      if (data?.role) setDiscordInviteLink(data.role);
    });
    supabase.from("permission_settings").select("role").eq("permission_key", "discord_invite_description").single().then(({ data }) => {
      if (data?.role) setDiscordInviteDescription(data.role);
    });
    supabase.from("permission_settings").select("permission_key, role").in("permission_key", ["aufstellung_next_at", "aufstellung_ort", "aufstellung_auto_enabled"]).then(({ data }) => {
      for (const r of data || []) {
        if (r.permission_key === "aufstellung_next_at" && r.role) {
          // datetime-local needs format YYYY-MM-DDTHH:mm
          try {
            const d = new Date(r.role);
            if (!isNaN(d.getTime())) {
              const pad = (n: number) => String(n).padStart(2, "0");
              setAufstellungAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
            }
          } catch {}
        }
        if (r.permission_key === "aufstellung_ort" && r.role) setAufstellungOrt(r.role);
        if (r.permission_key === "aufstellung_auto_enabled") setAufstellungAuto(r.role === "true");
      }
    });
    supabase.from("permission_settings").select("permission_key, role").in("permission_key", ["stats_ping_director_id", "stats_ping_codirector_id"]).then(({ data }) => {
      for (const r of data || []) {
        if (r.permission_key === "stats_ping_director_id" && r.role) setStatsPingDirector(r.role);
        if (r.permission_key === "stats_ping_codirector_id" && r.role) setStatsPingCoDirector(r.role);
      }
    });
    supabase.from("permission_settings").select("role").eq("permission_key", "sr_max_attempts").maybeSingle().then(({ data }) => {
      if (data?.role) setSrMaxAttempts(data.role);
    });
  }, [isAdmin]);

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

  // Letzte Aktivität (1080 Verfolgungen oder Einsätze) pro User innerhalb der letzten 14 Tage
  const { data: lastActivityMap } = useQuery({
    queryKey: ["admin-last-activity"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: missions }, { data: pursuits }] = await Promise.all([
        supabase.from("missions").select("created_by, created_at").gte("created_at", since),
        supabase.from("pursuits").select("created_by, created_at").gte("created_at", since),
      ]);
      const map = new Map<string, number>();
      const consume = (rows: any[] | null) => {
        (rows || []).forEach((r: any) => {
          if (!r.created_by) return;
          const t = new Date(r.created_at).getTime();
          const prev = map.get(r.created_by) ?? 0;
          if (t > prev) map.set(r.created_by, t);
        });
      };
      consume(missions);
      consume(pursuits);
      return map;
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
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

  // User-Accounts mit der Rolle "Fluglizenz"
  const { data: licenseHolders, isLoading: licenseLoading } = useQuery({
    queryKey: ["admin-license-holders"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "flight_license");
      if (!roles?.length) return [];

      const userIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, internal_dienstnummer, image_url, is_approved, created_at")
        .in("id", userIds);

      const { data: validity } = await supabase
        .from("flight_license_validity")
        .select("user_id, valid_until, issued_at")
        .in("user_id", userIds);

      const validityMap = new Map<string, { valid_until: string | null; issued_at: string | null }>(
        (validity || []).map((v: any) => [v.user_id, { valid_until: v.valid_until, issued_at: v.issued_at }]),
      );

      return (profiles || []).map((p: any) => ({
        id: p.id,
        profile: p,
        role: "flight_license",
        created_at: p.created_at,
        valid_until: validityMap.get(p.id)?.valid_until || null,
        issued_at: validityMap.get(p.id)?.issued_at || null,
      }));
    },
    enabled: isAdmin && activeTab === "licenses",
  });

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
        const { error } = await supabase.from("profiles").update({ is_approved: true, is_blocked: false } as any).eq("id", userId);
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

  const blockMutation = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const { error } = await supabase.from("profiles").update({ 
        is_blocked: block, 
        is_approved: !block 
      } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const targetName = users?.find(u => u.id === vars.userId)?.name || "Unbekannt";
      toast.success(vars.block ? `${targetName} wurde gesperrt` : `${targetName} wurde entsperrt`);
      logActivity(vars.block ? "Benutzer gesperrt" : "Benutzer entsperrt", "admin", { 
        target_user_id: vars.userId, target_name: targetName 
      });
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
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Benutzer gelöscht");
      logActivity("Benutzer gelöscht", "admin", { target_user_id: userId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const licenseValidityMutation = useMutation({
    mutationFn: async ({ userId, validUntil, issuedAt }: { userId: string; validUntil: string | null; issuedAt?: string | null }) => {
      if (!validUntil && issuedAt === undefined) {
        const { error } = await supabase
          .from("flight_license_validity")
          .delete()
          .eq("user_id", userId);
        if (error) throw error;
        return;
      }
      const payload: any = { user_id: userId };
      if (validUntil !== undefined) payload.valid_until = validUntil;
      if (issuedAt !== undefined) payload.issued_at = issuedAt;
      const { error } = await supabase
        .from("flight_license_validity")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-license-holders"] });
      toast.success(vars.validUntil ? "Gültigkeit gespeichert" : "Gültigkeit entfernt");
      const targetName = licenseHolders?.find((l: any) => l.id === vars.userId)?.profile?.name || "Unbekannt";
      logActivity(
        vars.validUntil
          ? `Lizenz-Gültigkeit gesetzt: ${vars.validUntil}`
          : `Lizenz-Gültigkeit entfernt`,
        "admin",
        { target_user_id: vars.userId, target_name: targetName, valid_until: vars.validUntil },
      );
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

  const internalDnMutation = useMutation({
    mutationFn: async ({ userId, internalDn }: { userId: string; internalDn: string }) => {
      const value = internalDn.trim() || null;
      const { error } = await supabase.from("profiles").update({ internal_dienstnummer: value } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Interne Dienstnummer gespeichert");
      setEditingInternalDn((prev) => { const next = { ...prev }; delete next[vars.userId]; return next; });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("unique") ? "Diese interne Dienstnummer ist bereits vergeben" : e.message;
      toast.error(msg);
    },
  });

  const srTrainingMutation = useMutation({
    mutationFn: async ({ userId, value }: { userId: string; value: boolean }) => {
      const { error } = await supabase.from("profiles").update({ has_sr_training: value } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(vars.value ? "SR-Training markiert" : "SR-Training entfernt");
      logActivity(vars.value ? "SR-Training markiert" : "SR-Training entfernt", "admin", { target_user_id: vars.userId });
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
            { reset_type: "pursuits_monthly", reset_by: request.requested_by, reset_at: now },
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

  const APPLICANT_ROLES = new Set(["asd_applicant", "flight_applicant"]);
  const LICENSE_ONLY_ROLES = new Set(["flight_license"]);
  const pending = users?.filter((u) => !u.is_approved && !(u as any).is_blocked) || [];
  const approvedAll = users?.filter((u) => u.is_approved && !(u as any).is_blocked) || [];
  const approved = sortByRankAndDn(
    approvedAll.filter((u) => !APPLICANT_ROLES.has(u.role) && !LICENSE_ONLY_ROLES.has(u.role)),
  );
  const applicants = sortByRankAndDn(approvedAll.filter((u) => APPLICANT_ROLES.has(u.role)));
  const blocked = users?.filter((u) => (u as any).is_blocked) || [];

  // ASD-Mitglieder bekommen Inaktivitäts-Status anhand der letzten 1080/Einsatz-Aktivität.
  // Bewerber, Fluglizenz-Accounts und Trial Member werden hier nicht markiert.
  const INACTIVE_TRACKED_ROLES = new Set([
    "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member",
  ]);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  /** Liefert den Inaktivitäts-Status:
   *  - "active":   Aktivität in den letzten 7 Tagen
   *  - "inactive": keine Aktivität seit ≥ 7 Tagen (orange)
   *  - "abwesend": keine Aktivität seit ≥ 14 Tagen (rot)
   */
  const getActivityStatus = (u: any): "active" | "inactive" | "abwesend" => {
    if (!INACTIVE_TRACKED_ROLES.has(u.role)) return "active";
    const last = lastActivityMap?.get(u.id) ?? 0;
    const ageDays = (Date.now() - last) / ONE_DAY;
    if (ageDays >= 14) return "abwesend";
    if (ageDays >= 7) return "inactive";
    return "active";
  };

  const renderActivityBadge = (u: any, withIcon = false) => {
    const status = getActivityStatus(u);
    if (status === "abwesend") {
      return (
        <span
          className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium inline-flex items-center gap-1"
          title="Keine 10-80 oder Einsätze seit 14+ Tagen"
        >
          {withIcon && <Activity className="w-3 h-3" />} Abwesend
        </span>
      );
    }
    if (status === "inactive") {
      return (
        <span
          className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium inline-flex items-center gap-1"
          title="Keine 10-80 oder Einsätze in den letzten 7 Tagen"
        >
          {withIcon && <Activity className="w-3 h-3" />} Inaktiv
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
        Aktiv
      </span>
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDetails = (details: any): string => {
    if (!details || Object.keys(details).length === 0) return "";
    const parts: string[] = [];
    if (Array.isArray(details.changed_fields) && details.changed_fields.length > 0) {
      parts.push(`Geändert: ${details.changed_fields.join(", ")}`);
    }
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

  const formatValue = (v: any) => {
    if (v === null || v === undefined || v === "") return "–";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      const d = new Date(v);
      return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    return String(v);
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
        <TabsList className="grid grid-cols-9 w-full max-w-5xl">
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Benutzer
          </TabsTrigger>
          <TabsTrigger value="applicants" className="gap-1.5 text-xs relative">
            <UserPlus className="w-3.5 h-3.5" /> Bewerber
            {applicants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {applicants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-1.5 text-xs relative">
            <Ban className="w-3.5 h-3.5" /> Gesperrt
            {blocked.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {blocked.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" /> Rechte
          </TabsTrigger>
          <TabsTrigger value="licenses" className="gap-1.5 text-xs">
            <Plane className="w-3.5 h-3.5" /> Lizenzen
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1.5 text-xs">
            <Trophy className="w-3.5 h-3.5" /> Achievements
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
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" /> Einstellungen
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
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
                        <Input
                          value={editingInternalDn[u.id] ?? (u as any).internal_dienstnummer ?? ""}
                          onChange={(e) => setEditingInternalDn({ ...editingInternalDn, [u.id]: e.target.value })}
                          placeholder="Interne DN (z.B. ASD-01)"
                          className="h-7 text-xs bg-background border-border flex-1"
                        />
                        {editingInternalDn[u.id] !== undefined && editingInternalDn[u.id] !== ((u as any).internal_dienstnummer ?? "") && (
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => internalDnMutation.mutate({ userId: u.id, internalDn: editingInternalDn[u.id] })}>
                            ✓
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })} disabled={!canEditUser(currentUserRole, u.role)}>
                          <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>{assignableRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
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
                      {renderActivityBadge(u)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
                      <Input
                        value={editingInternalDn[u.id] ?? (u as any).internal_dienstnummer ?? ""}
                        onChange={(e) => setEditingInternalDn({ ...editingInternalDn, [u.id]: e.target.value })}
                        placeholder="Interne DN (z.B. ASD-01)"
                        className="h-7 text-xs bg-background border-border flex-1"
                      />
                      {editingInternalDn[u.id] !== undefined && editingInternalDn[u.id] !== ((u as any).internal_dienstnummer ?? "") && (
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => internalDnMutation.mutate({ userId: u.id, internalDn: editingInternalDn[u.id] })}>
                          ✓
                        </Button>
                      )}
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
                      <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })} disabled={!canEditUser(currentUserRole, u.role)}>
                        <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{assignableRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                      {canEditUser(currentUserRole, u.role) && (
                        <Button size="sm" variant="destructive" onClick={() => blockMutation.mutate({ userId: u.id, block: true })} className="gap-1.5 h-7 text-xs">
                          <Ban className="w-3 h-3" /> Sperren
                        </Button>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={!!(u as any).has_sr_training}
                        onCheckedChange={(v) => srTrainingMutation.mutate({ userId: u.id, value: !!v })}
                      />
                      <LifeBuoy className="w-3.5 h-3.5 text-primary" />
                      <span>Search & Rescue Ausbildung</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Interne DN</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Dienstnummer</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Discord ID</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Rolle</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">SR</th>
                      <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approved.map((u) => (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                        <td className="px-4 py-3 font-medium">{u.name || "–"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={editingInternalDn[u.id] ?? (u as any).internal_dienstnummer ?? ""}
                              onChange={(e) => setEditingInternalDn({ ...editingInternalDn, [u.id]: e.target.value })}
                              placeholder="ASD-01"
                              className="h-7 text-xs bg-background border-border w-28 font-mono"
                            />
                            {editingInternalDn[u.id] !== undefined && editingInternalDn[u.id] !== ((u as any).internal_dienstnummer ?? "") && (
                              <Button size="sm" className="h-7 text-xs px-2" onClick={() => internalDnMutation.mutate({ userId: u.id, internalDn: editingInternalDn[u.id] })}>
                                ✓
                              </Button>
                            )}
                          </div>
                        </td>
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
                          {renderActivityBadge(u, true)}
                        </td>
                        <td className="px-4 py-3">
                          <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })} disabled={!canEditUser(currentUserRole, u.role)}>
                            <SelectTrigger className="w-36 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>{assignableRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center" title="Search & Rescue Ausbildung">
                            <Checkbox
                              checked={!!(u as any).has_sr_training}
                              onCheckedChange={(v) => srTrainingMutation.mutate({ userId: u.id, value: !!v })}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {canEditUser(currentUserRole, u.role) ? (
                            <Button size="sm" variant="destructive" onClick={() => blockMutation.mutate({ userId: u.id, block: true })} className="gap-1.5 h-7 text-xs">
                              <Ban className="w-3 h-3" /> Sperren
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Geschützt</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Free internal Dienstnummern (1-18) */}
              {(() => {
                const used = new Set<number>();
                (users || []).forEach((u: any) => {
                  const m = (u.internal_dienstnummer || "").match(/\d+/);
                  if (m) used.add(parseInt(m[0], 10));
                });
                const free: number[] = [];
                for (let i = 1; i <= 18; i++) if (!used.has(i)) free.push(i);
                return (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                        Freie interne Dienstnummern (1–18)
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {free.length} von 18 frei
                      </span>
                    </div>
                    {free.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Alle Dienstnummern von 1 bis 18 sind vergeben.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {free.map((n) => (
                          <span
                            key={n}
                            className="inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-semibold"
                          >
                            ASD-{String(n).padStart(2, "0")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* Bewerber Tab */}
        <TabsContent value="applicants">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Bewerber ({applicants.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              ASD- und Flugbewerber werden hier separat verwaltet und erscheinen nicht in der regulären Benutzerliste.
            </p>
            {applicants.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-card border border-border rounded-lg">
                Keine Bewerber vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {applicants.map((u) => (
                  <div key={u.id} className="bg-card border border-primary/20 rounded-lg px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.name || "Unbekannt"}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.dienstnummer || "Keine DN"} · {ROLE_LABELS[u.role] || u.role}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {u.role === "asd_applicant" ? "ASD-Bewerber" : "Flug-Bewerber"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        defaultValue={u.role}
                        onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })}
                        disabled={!canEditUser(currentUserRole, u.role)}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{assignableRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                      {canEditUser(currentUserRole, u.role) && (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => blockMutation.mutate({ userId: u.id, block: true })} className="gap-1.5 h-8 text-xs">
                            <Ban className="w-3.5 h-3.5" /> Sperren
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(u.id)} className="gap-1.5 h-8 text-xs">
                            <Trash2 className="w-3.5 h-3.5" /> Löschen
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Blocked Users Tab */}
        <TabsContent value="blocked">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-destructive uppercase tracking-wider flex items-center gap-2">
              <Ban className="w-4 h-4" /> Gesperrte Benutzer ({blocked.length})
            </h2>
            {blocked.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-card border border-border rounded-lg">
                Keine gesperrten Benutzer vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {blocked.map((u) => (
                  <div key={u.id} className="bg-card border border-destructive/20 rounded-lg px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.name || "Unbekannt"}</p>
                        <p className="text-xs text-muted-foreground">{u.dienstnummer || "Keine DN"} · {ROLE_LABELS[u.role] || u.role}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Gesperrt</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => blockMutation.mutate({ userId: u.id, block: false })} className="gap-1.5 h-8 text-xs">
                        <Unlock className="w-3.5 h-3.5" /> Entsperren
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(u.id)} className="gap-1.5 h-8 text-xs">
                        <Trash2 className="w-3.5 h-3.5" /> Endgültig löschen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionMatrixSection approved={approved} roleMutation={roleMutation} />
        </TabsContent>

        <TabsContent value="licenses">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Plane className="w-4 h-4" /> Fluglizenz-Inhaber
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-medium text-[10px]">
                Gesamt: {licenseHolders?.length || 0}
              </span>
            </div>
            {licenseLoading ? (
              <div className="flex justify-center py-8"><div className="text-primary animate-pulse text-sm">Lade...</div></div>
            ) : !licenseHolders?.length ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-card border border-border rounded-lg">
                Keine User mit der Rolle "Fluglizenz" vorhanden
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background/50">
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Dienstnummer</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Interne DN</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Rolle</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Ausgestellt am</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Gültig bis</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Registriert</th>
                        <th className="px-4 py-3 text-left text-primary font-semibold text-xs uppercase tracking-wider">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenseHolders.map((lic: any) => {
                        const validUntil: string | null = lic.valid_until || null;
                        const issuedAt: string | null = lic.issued_at || null;
                        let statusLabel = "Nicht gesetzt";
                        let statusClass = "bg-muted text-muted-foreground";
                        if (validUntil) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const expiry = new Date(validUntil);
                          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
                          if (diffDays < 0) {
                            statusLabel = "Abgelaufen";
                            statusClass = "bg-red-500/10 text-red-400";
                          } else if (diffDays <= 14) {
                            statusLabel = `Läuft bald ab (${diffDays}T)`;
                            statusClass = "bg-yellow-500/10 text-yellow-400";
                          } else {
                            statusLabel = "Aktiv";
                            statusClass = "bg-emerald-500/10 text-emerald-400";
                          }
                        }
                        return (
                        <tr key={lic.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {lic.profile?.image_url && (
                                <img src={lic.profile.image_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                              )}
                              <span className="font-medium text-xs">{lic.profile?.name || "–"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {lic.profile?.dienstnummer || <span className="text-muted-foreground">–</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {lic.profile?.internal_dienstnummer || <span className="text-muted-foreground">–</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-medium">
                              {ROLE_LABELS[lic.role] || lic.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <Input
                              type="date"
                              defaultValue={issuedAt || ""}
                              key={`issued-${issuedAt || "empty"}`}
                              onBlur={(e) => {
                                const newIssued = e.target.value || null;
                                if ((newIssued || null) === (issuedAt || null)) return;
                                let computedValidUntil: string | null = validUntil;
                                if (newIssued) {
                                  const d = new Date(newIssued);
                                  d.setMonth(d.getMonth() + 4);
                                  computedValidUntil = d.toISOString().split("T")[0];
                                }
                                licenseValidityMutation.mutate({
                                  userId: lic.id,
                                  issuedAt: newIssued,
                                  validUntil: computedValidUntil,
                                });
                              }}
                              className="h-7 text-xs w-36 bg-background"
                              title="Ausstellungsdatum – Gültig bis wird automatisch +4 Monate gesetzt"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-mono tabular-nums text-xs px-2 py-1 rounded bg-background/60 border border-border w-36 inline-block">
                                {validUntil ? new Date(validUntil).toLocaleDateString("de-DE") : <span className="text-muted-foreground">–</span>}
                              </span>
                              {(validUntil || issuedAt) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => licenseValidityMutation.mutate({ userId: lic.id, validUntil: null, issuedAt: null })}
                                  title="Gültigkeit entfernen"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                            {lic.created_at ? new Date(lic.created_at).toLocaleDateString("de-DE") : "–"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="gap-1.5 h-7 text-xs">
                                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Fluglizenz-Account löschen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Möchtest du den Account „{lic.profile?.name || "–"}" endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(lic.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Endgültig löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <AchievementsManager />
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
                          <>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {formatDetails(log.details)}
                            </p>
                            {Array.isArray(log.details.changes) && log.details.changes.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5 border-l-2 border-primary/30 pl-2">
                                {log.details.changes.map((c: any, idx: number) => (
                                  <li key={idx} className="text-[10px] text-muted-foreground">
                                    <span className="font-semibold text-foreground/80">{c.field}:</span>{" "}
                                    <span className="line-through opacity-60">{formatValue(c.from)}</span>
                                    <span className="mx-1 text-primary">→</span>
                                    <span className="text-primary font-medium">{formatValue(c.to)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {Array.isArray(log.details.vehicle_changes) && log.details.vehicle_changes.length > 0 && (
                              <ul className="mt-1 space-y-0.5 border-l-2 border-amber-500/30 pl-2">
                                {log.details.vehicle_changes.map((v: any, idx: number) => (
                                  <li key={idx} className="text-[10px] text-muted-foreground">
                                    <span className="font-semibold text-foreground/80">
                                      {v.action === "added" ? "+ Fahrzeug hinzugefügt:" : v.action === "deleted" ? "− Fahrzeug gelöscht:" : "✎ Fahrzeug bearbeitet:"}
                                    </span>{" "}
                                    <span className="text-foreground/90">{v.label}</span>
                                    {v.fields && v.fields.length > 0 && (
                                      <span className="text-muted-foreground"> ({v.fields.join(", ")})</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
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
        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Discord-Server Einladungslink
              </h2>
              <p className="text-xs text-muted-foreground">
                Dieser Link wird allen Nutzern im Profil angezeigt, damit sie dem Discord-Server beitreten können.
              </p>
              <div className="flex gap-2">
                <Input
                  value={discordInviteLink}
                  onChange={(e) => setDiscordInviteLink(e.target.value)}
                  placeholder="https://discord.gg/dein-server"
                  className="bg-background border-border"
                />
                <Button
                  onClick={async () => {
                    setSavingLink(true);
                    try {
                      // Update existing row
                      const { error } = await supabase
                        .from("permission_settings")
                        .update({ role: discordInviteLink.trim() } as any)
                        .eq("permission_key", "discord_invite_link");
                      if (error) throw error;
                      toast.success("Discord-Link gespeichert");
                      logActivity("Discord-Einladungslink aktualisiert", "admin", { link: discordInviteLink.trim() });
                    } catch {
                      toast.error("Fehler beim Speichern");
                    } finally {
                      setSavingLink(false);
                    }
                  }}
                  disabled={savingLink}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Speichern
                </Button>
              </div>
              {discordInviteLink && (
                <a href={discordInviteLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#5865F2] hover:underline">
                  <ExternalLink className="w-3 h-3" /> Vorschau: {discordInviteLink}
                </a>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Discord-Server Beschreibung
              </h2>
              <p className="text-xs text-muted-foreground">
                Diese Beschreibung wird zusammen mit dem Einladungslink im Profil angezeigt.
              </p>
              <Textarea
                value={discordInviteDescription}
                onChange={(e) => setDiscordInviteDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Discord-Servers (z. B. Regeln, Zweck, was die Nutzer erwartet)..."
                className="bg-background border-border min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    setSavingDescription(true);
                    try {
                      const { error } = await supabase
                        .from("permission_settings")
                        .update({ role: discordInviteDescription } as any)
                        .eq("permission_key", "discord_invite_description");
                      if (error) throw error;
                      toast.success("Beschreibung gespeichert");
                      logActivity("Discord-Beschreibung aktualisiert", "admin");
                    } catch {
                      toast.error("Fehler beim Speichern");
                    } finally {
                      setSavingDescription(false);
                    }
                  }}
                  disabled={savingDescription}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Speichern
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <LifeBuoy className="w-4 h-4" /> SR-Theorieprüfung – Versuchslimit
              </h2>
              <p className="text-xs text-muted-foreground">
                Anzahl Versuche, die ein Member für die SR-Theorieprüfung hat. Nach Erreichen des Limits ist die Prüfung gesperrt, bis ein Ausbilder den SR-Verlauf zurücksetzt.
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={srMaxAttempts}
                  onChange={(e) => setSrMaxAttempts(e.target.value)}
                  className="bg-background border-border w-32"
                />
                <Button
                  onClick={async () => {
                    const n = parseInt(srMaxAttempts, 10);
                    if (Number.isNaN(n) || n < 1) {
                      toast.error("Bitte eine Zahl ≥ 1 eingeben");
                      return;
                    }
                    setSavingSrAttempts(true);
                    try {
                      const { data: existing } = await supabase
                        .from("permission_settings")
                        .select("id")
                        .eq("permission_key", "sr_max_attempts")
                        .maybeSingle();
                      if (existing) {
                        const { error } = await supabase
                          .from("permission_settings")
                          .update({ role: String(n) } as any)
                          .eq("permission_key", "sr_max_attempts");
                        if (error) throw error;
                      } else {
                        const { error } = await supabase
                          .from("permission_settings")
                          .insert({ permission_key: "sr_max_attempts", role: String(n), allowed: true } as any);
                        if (error) throw error;
                      }
                      toast.success("Versuchslimit gespeichert");
                      logActivity("SR-Versuchslimit aktualisiert", "admin", { value: n });
                    } catch (e: any) {
                      toast.error("Fehler: " + (e?.message ?? "Speichern fehlgeschlagen"));
                    } finally {
                      setSavingSrAttempts(false);
                    }
                  }}
                  disabled={savingSrAttempts}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Speichern
                </Button>
              </div>
            </div>

            {/* Wöchentliche Aufstellung — Discord Ankündigung */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Wöchentliche Aufstellung — Discord Ankündigung
              </h2>
              <p className="text-xs text-muted-foreground">
                Diese Ankündigung wird automatisch jeden <strong>Freitag um 18:00 Uhr</strong> (deutsche Zeit) im Ankündigungs-Channel gepostet.
                Setze hier das Datum & die Uhrzeit der nächsten Aufstellung sowie den Ort.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Datum & Uhrzeit der Aufstellung
                  </label>
                  <Input
                    type="datetime-local"
                    value={aufstellungAt}
                    onChange={(e) => setAufstellungAt(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Ort</label>
                  <Input
                    value={aufstellungOrt}
                    onChange={(e) => setAufstellungOrt(e.target.value)}
                    placeholder="z. B. Vespucci Police Department Dach"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={aufstellungAuto}
                  onChange={(e) => setAufstellungAuto(e.target.checked)}
                  className="accent-primary"
                />
                Automatische Freitags-Ankündigung aktivieren
              </label>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!aufstellungAt) {
                      toast.error("Bitte zuerst Datum & Uhrzeit setzen");
                      return;
                    }
                    setSendingAufstellung(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("discord-notify", {
                        body: {
                          type: "aufstellung_announcement",
                          data: { start_at: new Date(aufstellungAt).toISOString(), ort: aufstellungOrt },
                        },
                      });
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      toast.success("Ankündigung gepostet");
                      logActivity("Aufstellungs-Ankündigung manuell gesendet", "admin");
                    } catch (e: any) {
                      toast.error(e.message ?? "Fehler beim Senden");
                    } finally {
                      setSendingAufstellung(false);
                    }
                  }}
                  disabled={sendingAufstellung || !aufstellungAt}
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Jetzt testen / senden
                </Button>
                <Button
                  onClick={async () => {
                    setSavingAufstellung(true);
                    try {
                      const isoAt = aufstellungAt ? new Date(aufstellungAt).toISOString() : "";
                      const updates = [
                        { permission_key: "aufstellung_next_at", role: isoAt },
                        { permission_key: "aufstellung_ort", role: aufstellungOrt.trim() || "Vespucci Police Department Dach" },
                        { permission_key: "aufstellung_auto_enabled", role: aufstellungAuto ? "true" : "false" },
                      ];
                      for (const u of updates) {
                        const { error } = await supabase
                          .from("permission_settings")
                          .update({ role: u.role } as any)
                          .eq("permission_key", u.permission_key);
                        if (error) throw error;
                      }
                      toast.success("Einstellungen gespeichert");
                      logActivity("Aufstellungs-Einstellungen aktualisiert", "admin", { start_at: isoAt, ort: aufstellungOrt, auto: aufstellungAuto });
                    } catch (e: any) {
                      toast.error(e.message ?? "Fehler beim Speichern");
                    } finally {
                      setSavingAufstellung(false);
                    }
                  }}
                  disabled={savingAufstellung}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Speichern
                </Button>
              </div>
            </div>

            {/* Discord Stats Ping — Director & Co-Director */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Discord Statistik-Ping
              </h2>
              <p className="text-xs text-muted-foreground">
                Hinterlege hier die <strong>Discord-User-IDs</strong> von Director und Co-Director. Diese beiden werden bei jeder
                wöchentlichen und monatlichen Statistik im Discord automatisch markiert (gepingt).
                Discord-ID findest du, indem du im Discord mit Rechtsklick auf den User → "ID kopieren" klickst (Entwicklermodus aktivieren).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Director Discord-ID</label>
                  <Input
                    value={statsPingDirector}
                    onChange={(e) => setStatsPingDirector(e.target.value)}
                    placeholder="z. B. 123456789012345678"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Co-Director Discord-ID</label>
                  <Input
                    value={statsPingCoDirector}
                    onChange={(e) => setStatsPingCoDirector(e.target.value)}
                    placeholder="z. B. 123456789012345678"
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  onClick={async () => {
                    setSavingStatsPings(true);
                    try {
                      const updates = [
                        { permission_key: "stats_ping_director_id", role: statsPingDirector.trim() },
                        { permission_key: "stats_ping_codirector_id", role: statsPingCoDirector.trim() },
                      ];
                      for (const u of updates) {
                        const { error } = await supabase
                          .from("permission_settings")
                          .update({ role: u.role } as any)
                          .eq("permission_key", u.permission_key);
                        if (error) throw error;
                      }
                      toast.success("Discord-IDs gespeichert");
                      logActivity("Stats-Ping Discord-IDs aktualisiert", "admin");
                    } catch (e: any) {
                      toast.error(e.message ?? "Fehler beim Speichern");
                    } finally {
                      setSavingStatsPings(false);
                    }
                  }}
                  disabled={savingStatsPings}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Speichern
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;