import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SearchAndRescueContent from "@/components/SearchAndRescueContent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, CheckCircle2, Clock, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

type Signup = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
};

const SearchRescuePage = () => {
  const { user } = useAuth();
  const [hasSr, setHasSr] = useState(false);
  const [signup, setSignup] = useState<Signup | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [profileRes, signupRes] = await Promise.all([
      supabase.from("profiles").select("has_sr_training").eq("id", user.id).maybeSingle(),
      supabase.from("sr_training_signups" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setHasSr(!!(profileRes.data as any)?.has_sr_training);
    setSignup(signupRes.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleSignup = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("sr_training_signups" as any).insert({ user_id: user.id, status: "pending" });
    setSubmitting(false);
    if (error) {
      toast.error("Anmeldung fehlgeschlagen: " + error.message);
      return;
    }
    toast.success("Anmeldung zur SR-Ausbildung gesendet");
    logActivity("Hat sich zur SR-Ausbildung angemeldet", "training");
    load();
  };

  const renderStatusCard = () => {
    if (loading) return null;
    if (hasSr) {
      return (
        <Card className="bg-primary/5 border-primary/40 p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Du bist zertifizierter SR-Pilot</h2>
            <p className="text-sm text-muted-foreground">Du hast die Search & Rescue Ausbildung erfolgreich abgeschlossen.</p>
          </div>
        </Card>
      );
    }
    if (signup?.status === "pending") {
      return (
        <Card className="bg-yellow-500/5 border-yellow-500/40 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-yellow-500">Anmeldung läuft</h2>
              <p className="text-sm text-muted-foreground">Deine Anmeldung wird vom Ausbilder-Team geprüft.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">In Prüfung</Badge>
        </Card>
      );
    }
    if (signup?.status === "rejected") {
      return (
        <Card className="bg-destructive/5 border-destructive/40 p-6 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-destructive">Anmeldung abgelehnt</h2>
              {signup.note && <p className="text-sm text-muted-foreground">Hinweis: {signup.note}</p>}
            </div>
          </div>
          <Button onClick={handleSignup} disabled={submitting} className="gap-2">
            <LifeBuoy className="w-4 h-4" /> Erneut anmelden
          </Button>
        </Card>
      );
    }
    return (
      <Card className="bg-card border-border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <LifeBuoy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Search & Rescue Ausbildung</h2>
            <p className="text-sm text-muted-foreground">Lies die Theorie unten und melde dich für die Ausbildung an.</p>
          </div>
        </div>
        <Button onClick={handleSignup} disabled={submitting} className="gap-2">
          <CheckCircle2 className="w-4 h-4" /> Zur SR-Ausbildung anmelden
        </Button>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-primary" /> Search & Rescue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Spezialausbildung für Personenbergung & urbane Rettung</p>
      </div>
      {renderStatusCard()}
      <SearchAndRescueContent />
    </div>
  );
};

export default SearchRescuePage;
