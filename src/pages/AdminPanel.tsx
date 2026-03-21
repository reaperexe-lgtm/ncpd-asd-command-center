import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const ROLES = ["director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member"] as const;
const ROLE_LABELS: Record<string, string> = {
  director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
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
        role_id: roles?.find((r) => r.user_id === p.id)?.id,
      }));
    },
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_approved: approve }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Status aktualisiert"); },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Rolle aktualisiert"); },
  });

  if (!isAdmin) return <p className="text-destructive">Kein Zugriff.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Admin – Benutzerverwaltung</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Lade...</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-primary font-semibold">Name</th>
                <th className="px-4 py-3 text-primary font-semibold">Status</th>
                <th className="px-4 py-3 text-primary font-semibold">Rolle</th>
                <th className="px-4 py-3 text-primary font-semibold">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-4 py-3">{u.name || "–"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.is_approved ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                      {u.is_approved ? "Aktiv" : "Ausstehend"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect current={u.role} onChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r })} />
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {!u.is_approved && (
                      <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ userId: u.id, approve: true })}>
                        Freischalten
                      </Button>
                    )}
                    {u.is_approved && (
                      <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ userId: u.id, approve: false })}>
                        Sperren
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const RoleSelect = ({ current, onChange }: { current: string; onChange: (r: string) => void }) => (
  <Select value={current} onValueChange={onChange}>
    <SelectTrigger className="w-40 h-8 text-xs bg-card border-border">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {ROLES.map((r) => (
        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default AdminPanel;
