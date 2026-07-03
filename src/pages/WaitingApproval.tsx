import { useAuth } from "@/contexts/AuthContext";
import asdLogo from "@/assets/asd-logo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const WaitingApproval = () => {
  const { signOut, user } = useAuth();
  const [checking, setChecking] = useState(true);

  const recheck = async () => {
    if (!user) return;
    setChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.is_approved) {
      // Force full reload so AuthContext re-fetches cleanly
      window.location.href = "/";
      return;
    }
    setChecking(false);
  };

  useEffect(() => {
    recheck();
    const t = setInterval(recheck, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <img src={asdLogo} alt="ASD" className="w-20 h-20 rounded-full mx-auto" />
        <h1 className="text-xl font-bold text-primary">Warte auf Freischaltung</h1>
        <p className="text-muted-foreground text-sm">
          Dein Account ({user?.email}) wurde erstellt, aber noch nicht freigeschaltet.
          Ein Director oder Co-Director muss deinen Zugang genehmigen.
        </p>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={recheck}
            disabled={checking}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {checking ? "Prüfe..." : "Erneut prüfen"}
          </button>
          <button onClick={signOut} className="text-sm text-primary hover:underline">
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingApproval;
