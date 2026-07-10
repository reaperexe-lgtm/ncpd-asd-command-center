import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveRole, hasAdminPermissions, type AppRole } from "@/lib/roles";
import { cleanupOldTrialMemberExamResults } from "@/lib/supabaseFunctions";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  roles: AppRole[];
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: { name: string; image_url: string | null; dienstnummer: string | null } | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, role: null, roles: [], isApproved: false, isAdmin: false, loading: true, signOut: async () => {}, profile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.error) console.error("Profile fetch error:", profileRes.error);
      if (roleRes.error) console.error("Role fetch error:", roleRes.error);

      const profileData = profileRes.data
        ? {
            name: profileRes.data.name,
            image_url: profileRes.data.image_url,
            dienstnummer: profileRes.data.dienstnummer,
          }
        : null;

      if (profileData) {
        setProfile(profileData);
        setIsApproved(profileRes.data.is_approved ?? false);
      }

      const allRoles = (roleRes.data || []).map((r: any) => r.role as AppRole);
      const primary = getEffectiveRole(allRoles);

      setRoles(allRoles);
      setRole(primary);
    } catch (e) {
      console.error("fetchUserData failed:", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety: never stay in loading state for more than 5s
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        setTimeout(() => {
          fetchUserData(session.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      } else {
        setRole(null);
        setRoles([]);
        setIsApproved(false);
        setProfile(null);
        setLoading(false);
      }
    });

    void cleanupOldTrialMemberExamResults(supabase as any).catch((error) => {
      console.warn("cleanupOldTrialMemberExamResults failed:", error);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = hasAdminPermissions(roles);

  return (
    <AuthContext.Provider value={{ session, user, role, roles, isApproved, isAdmin, loading, signOut: () => supabase.auth.signOut().then(() => {}), profile }}>
      {children}
    </AuthContext.Provider>
  );
};
