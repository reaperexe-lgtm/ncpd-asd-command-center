import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Zentraler Permission-Hook.
 * - Liest gespeicherte Overrides aus permission_settings
 * - Merged sie mit den DEFAULT_PERMISSIONS
 * - Director & Admin behalten IMMER alle Rechte (Sicherheitsnetz)
 * - Personen mit aktiver Fluglizenz erhalten zusätzlich Trial-Member-Rechte
 */

export type PermissionKey =
  | "admin_access"
  | "approve_users"
  | "change_roles"
  | "delete_users"
  | "manage_licenses"
  | "review_exams"
  | "delete_protocols"
  | "edit_protocols"
  | "reset_stats"
  | "manage_gangs"
  | "edit_questions"
  | "create_missions"
  | "create_pursuits";

export const DEFAULT_PERMISSIONS: { key: PermissionKey; label: string; description: string; defaultRoles: string[] }[] = [
  { key: "admin_access", label: "Admin-Bereich", description: "Zugriff auf den Admin-Bereich", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "approve_users", label: "Benutzer freischalten", description: "Neue Registrierungen genehmigen/ablehnen", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "change_roles", label: "Rollen ändern", description: "Benutzerrollen zuweisen und ändern", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "delete_users", label: "Benutzer löschen", description: "Benutzerkonten endgültig entfernen", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "manage_licenses", label: "Fluglizenzen verwalten", description: "Fluglizenzen erstellen, bearbeiten, löschen", defaultRoles: ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"] },
  { key: "review_exams", label: "Prüfungen bewerten", description: "Theorie- und Praxisprüfungen bewerten", defaultRoles: ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"] },
  { key: "delete_protocols", label: "Protokolle löschen", description: "Einsatz- und Verfolgungsprotokolle löschen", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "edit_protocols", label: "Protokolle bearbeiten", description: "Gespeicherte Protokolle nachträglich anpassen (Protokollschreiber etc.)", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "reset_stats", label: "Statistik zurücksetzen", description: "Statistiken zurücksetzen (mit Antrag)", defaultRoles: ["admin", "director", "co_director", "ausbilder"] },
  { key: "manage_gangs", label: "Familien/Gangs verwalten", description: "Familien und Gangs erstellen, bearbeiten, löschen", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "edit_questions", label: "Fragen bearbeiten", description: "Theorie-Prüfungsfragen erstellen und bearbeiten", defaultRoles: ["admin", "director", "co_director", "supervisor"] },
  { key: "create_missions", label: "Einsätze erstellen", description: "Neue Einsatzprotokolle anlegen", defaultRoles: ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member"] },
  { key: "create_pursuits", label: "Verfolgungen erstellen", description: "Neue 10-80 Verfolgungen anlegen", defaultRoles: ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "member", "trial_member"] },
];

// Rechte die NIEMAND einem Director / Admin entziehen kann
const PROTECTED_ROLES = ["admin", "director"];

// Permissions die ein Lizenzinhaber zusätzlich bekommt (entspricht trial_member)
const LICENSE_HOLDER_PERMISSIONS: PermissionKey[] = ["create_missions", "create_pursuits"];

export function usePermissions() {
  const { user, role, profile } = useAuth();

  const { data: overrides } = useQuery({
    queryKey: ["permission-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permission_settings").select("*");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  // Hat der aktuelle User eine aktive Fluglizenz?
  const { data: hasActiveLicense = false } = useQuery({
    queryKey: ["my-active-license", profile?.name],
    enabled: !!profile?.name,
    queryFn: async () => {
      const { data } = await supabase
        .from("flight_licenses")
        .select("id")
        .eq("name", profile!.name)
        .eq("status", "Aktiv")
        .limit(1);
      return (data?.length || 0) > 0;
    },
    staleTime: 60_000,
  });

  const can = (permKey: PermissionKey): boolean => {
    if (!role) return false;

    // Director & Admin: immer voll
    if (PROTECTED_ROLES.includes(role)) return true;

    const def = DEFAULT_PERMISSIONS.find((p) => p.key === permKey);
    if (!def) return false;

    // Effektive Rollen berechnen: Defaults + Overrides
    const roleSet = new Set(def.defaultRoles);
    const permOverrides = overrides?.filter((o) => o.permission_key === permKey) || [];
    for (const o of permOverrides) {
      if (o.allowed) roleSet.add(o.role);
      else roleSet.delete(o.role);
    }

    if (roleSet.has(role)) return true;

    // Fluglizenz-Bonus: aktive Lizenz = Trial-Member-Rechte
    if (hasActiveLicense && LICENSE_HOLDER_PERMISSIONS.includes(permKey)) {
      return true;
    }

    return false;
  };

  return { can, hasActiveLicense, role, userId: user?.id };
}
