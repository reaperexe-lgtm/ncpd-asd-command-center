import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "director" | "co_director" | "supervisor" | "ausbilder" | "trial_ausbilder" | "member" | "trial_member";

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
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
    ]);
    if (profileRes.data) {
      setProfile({ name: profileRes.data.name, image_url: profileRes.data.image_url, dienstnummer: profileRes.data.dienstnummer });
      setIsApproved(profileRes.data.is_approved ?? false);
    }
    if (roleRes.data) {
      setRole(roleRes.data.role as AppRole);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setIsApproved(false);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === "director" || role === "co_director" || role === "admin" || role === "supervisor";

  return (
    <AuthContext.Provider value={{ session, user, role, isApproved, isAdmin, loading, signOut: () => supabase.auth.signOut().then(() => {}), profile }}>
      {children}
    </AuthContext.Provider>
  );
};
