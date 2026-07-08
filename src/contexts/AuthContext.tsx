import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "director" | "co_director" | "supervisor" | "ausbilder" | "trial_ausbilder" | "member" | "trial_member" | "asd_applicant" | "flight_applicant" | "flight_license" | "team_red";

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

const ROLE_RANK: Record<string, number> = {
  admin: 0, team_red: 0, director: 1, co_director: 2, supervisor: 3,
  ausbilder: 4, trial_ausbilder: 5, member: 6, trial_member: 7,
  asd_applicant: 8, flight_applicant: 8, flight_license: 8,
};

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
      if (profileRes.data) {
        setProfile({ name: profileRes.data.name, image_url: profileRes.data.image_url, dienstnummer: profileRes.data.dienstnummer });
        setIsApproved(profileRes.data.is_approved ?? false);
      }
      if (roleRes.data && roleRes.data.length > 0) {
        const all = roleRes.data.map((r: any) => r.role as AppRole);
        const primary = [...all].sort((a, b) => (ROLE_RANK[a] ?? 99) - (ROLE_RANK[b] ?? 99))[0];
        setRoles(all);
        setRole(primary);
      }
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

  const isAdmin = role === "director" || role === "co_director" || role === "admin" || role === "supervisor" || role === "team_red";

  return (
    <AuthContext.Provider value={{ session, user, role, roles, isApproved, isAdmin, loading, signOut: () => supabase.auth.signOut().then(() => {}), profile }}>
      {children}
    </AuthContext.Provider>
  );
};
