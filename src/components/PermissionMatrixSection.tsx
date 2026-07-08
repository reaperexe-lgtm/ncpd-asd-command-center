import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Shield, Check, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member", "flight_license", "team_red"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
  flight_license: "Fluglizenz",
};

import { DEFAULT_PERMISSIONS } from "@/hooks/usePermissions";

// Rollen die NICHT in der Matrix entziehbar sind (Schutz für Director / Admin)
const PROTECTED_ROLES = new Set(["admin", "director"]);

interface PermissionMatrixSectionProps {
  approved: { id: string; name: string; dienstnummer: string | null; role: string }[];
  roleMutation: { mutate: (args: { userId: string; newRole: string; oldRole: string }) => void };
}

const PermissionMatrixSection = ({ approved, roleMutation }: PermissionMatrixSectionProps) => {
  const queryClient = useQueryClient();

  // Alle Rollen pro User (für Zweitrollen-Anzeige)
  const { data: allUserRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data || [];
    },
  });

  const rolesByUser = (allUserRoles || []).reduce((acc, r: any) => {
    (acc[r.user_id] ||= []).push(r.role);
    return acc;
  }, {} as Record<string, string[]>);

  const addSecondaryRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: role as any }, { onConflict: "user_id,role" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Zweitrolle hinzugefügt");
    },
    onError: (e: any) => toast.error(e.message || "Fehler"),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rolle entfernt");
    },
    onError: (e: any) => toast.error(e.message || "Fehler"),
  });

  // Load saved permission overrides from DB
  const { data: savedPermissions } = useQuery({
    queryKey: ["permission-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permission_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Build the effective matrix: defaults merged with DB overrides
  const getEffectiveRoles = (permKey: string, defaultRoles: string[]): string[] => {
    if (!savedPermissions || savedPermissions.length === 0) return defaultRoles;
    
    const overrides = savedPermissions.filter(s => s.permission_key === permKey);
    if (overrides.length === 0) return defaultRoles;
    
    // Build set from defaults, then apply overrides
    const roleSet = new Set(defaultRoles);
    for (const o of overrides) {
      if (o.allowed) roleSet.add(o.role);
      else roleSet.delete(o.role);
    }
    return Array.from(roleSet);
  };

  const togglePermission = useMutation({
    mutationFn: async ({ permKey, role, currentlyAllowed }: { permKey: string; role: string; currentlyAllowed: boolean }) => {
      // Upsert the permission setting
      const { error } = await supabase
        .from("permission_settings")
        .upsert(
          { permission_key: permKey, role, allowed: !currentlyAllowed, updated_at: new Date().toISOString() },
          { onConflict: "permission_key,role" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-settings"] });
      toast.success("Berechtigung aktualisiert");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const usersByRole = ROLES.reduce((acc, role) => {
    acc[role] = approved.filter(u => u.role === role);
    return acc;
  }, {} as Record<string, typeof approved>);

  return (
    <div className="space-y-6">
      {/* Permission Matrix */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/50">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-primary">Berechtigungsmatrix</h2>
          <span className="text-[10px] text-muted-foreground ml-auto">Klicke auf ✓ / ✗ zum Bearbeiten</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-3 py-2.5 text-left font-semibold text-primary uppercase tracking-wider min-w-[180px]">Berechtigung</th>
                {ROLES.map(r => (
                  <th key={r} className="px-2 py-2.5 text-center font-semibold text-primary uppercase tracking-wider whitespace-nowrap">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEFAULT_PERMISSIONS.map((perm) => {
                const effectiveRoles = getEffectiveRoles(perm.key, perm.defaultRoles);
                return (
                  <tr key={perm.key} className="border-b border-border/20 hover:bg-primary/[0.02] transition-colors">
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{perm.label}</p>
                      <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                    </td>
                    {ROLES.map(r => {
                      const isAllowed = effectiveRoles.includes(r);
                      const isProtected = PROTECTED_ROLES.has(r);
                      return (
                        <td key={r} className="px-2 py-2 text-center">
                          <button
                            onClick={() => {
                              if (isProtected) {
                                toast.info("Director & Admin behalten immer alle Rechte");
                                return;
                              }
                              togglePermission.mutate({ permKey: perm.key, role: r, currentlyAllowed: isAllowed });
                            }}
                            className={`p-1 rounded mx-auto block transition-colors ${isProtected ? "cursor-not-allowed opacity-70" : "hover:bg-primary/10"}`}
                            disabled={togglePermission.isPending}
                            title={isProtected ? "Geschützte Rolle – immer alle Rechte" : undefined}
                          >
                            {isAllowed ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/30" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users per Role */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/50">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-primary">Benutzer nach Rolle</h2>
        </div>
        <div className="divide-y divide-border/30">
          {ROLES.map(role => {
            const roleUsers = usersByRole[role] || [];
            return (
              <div key={role} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary">{ROLE_LABELS[role]}</span>
                  <span className="text-[10px] text-muted-foreground">{roleUsers.length} Benutzer</span>
                </div>
                {roleUsers.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">Keine Benutzer</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {roleUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 bg-background border border-border rounded-md px-2.5 py-1.5">
                        <span className="text-xs font-medium">{u.name}</span>
                        {u.dienstnummer && <span className="text-[10px] text-muted-foreground font-mono">({u.dienstnummer})</span>}
                        <Select defaultValue={u.role} onValueChange={(r) => roleMutation.mutate({ userId: u.id, newRole: r, oldRole: u.role })}>
                          <SelectTrigger className="w-28 h-6 text-[10px] bg-background border-border ml-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                        </Select>
                        {/* Zweitrollen-Chips */}
                        {(rolesByUser[u.id] || []).filter(r => r !== u.role).map(r => (
                          <span key={r} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5 text-[10px] text-primary">
                            +{ROLE_LABELS[r] || r}
                            <button
                              onClick={() => removeRole.mutate({ userId: u.id, role: r })}
                              className="hover:text-destructive"
                              title="Zweitrolle entfernen"
                              disabled={removeRole.isPending}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {/* + Zweitrolle hinzufügen */}
                        <Select value="" onValueChange={(r) => addSecondaryRole.mutate({ userId: u.id, role: r })}>
                          <SelectTrigger className="w-8 h-6 p-0 flex items-center justify-center bg-background border-border" title="Zweitrolle hinzufügen">
                            <Plus className="w-3 h-3" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.filter(r => !(rolesByUser[u.id] || []).includes(r)).map((r) => (
                              <SelectItem key={r} value={r}>+ {ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrixSection;
