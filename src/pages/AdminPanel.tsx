import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, UserX, Trash2 } from "lucide-react";

const ROLES = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
};

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Admin – Benutzerverwaltung</h1>
          <p className="text-xs text-muted-foreground">{users?.length || 0} Benutzer · {pending.length} ausstehend</p>
        </div>
      </div>

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
