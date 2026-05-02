import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "director" | "co_director" | "supervisor" | "ausbilder" | "trial_ausbilder" | "member" | "trial_member" | "asd_applicant" | "flight_applicant" | "flight_license";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: { name: string; image_url: string | null; dienstnummer: string | null } | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, role: null, isApproved: false, isAdmin: false, loading: true, signOut: async () => {}, profile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);
      if (profileRes.error) console.error("Profile fetch error:", profileRes.error);
      if (roleRes.error) console.error("Role fetch error:", roleRes.error);
      if (profileRes.data) {
        setProfile({ name: profileRes.data.name, image_url: profileRes.data.image_url, dienstnummer: profileRes.data.dienstnummer });
        setIsApproved(profileRes.data.is_approved ?? false);
      }
      if (roleRes.data) {
        setRole(roleRes.data.role as AppRole);
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

  const isAdmin = role === "director" || role === "co_director" || role === "admin" || role === "supervisor";

  return (
    <AuthContext.Provider value={{ session, user, role, isApproved, isAdmin, loading, signOut: () => supabase.auth.signOut().then(() => {}), profile }}>
      {children}
    </AuthContext.Provider>
  );
};
