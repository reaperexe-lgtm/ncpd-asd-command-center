import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, LifeBuoy, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

type Signup = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
  profile?: { name: string | null; dienstnummer: string | null; internal_dienstnummer: string | null; has_sr_training: boolean } | null;
};

const SRTrainingSignups = () => {
  const { user } = useAuth();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: list, error } = await supabase
      .from("sr_training_signups" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const ids = Array.from(new Set((list || []).map((s: any) => s.user_id)));
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, name, dienstnummer, internal_dienstnummer, has_sr_training").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles || []).map((p: any) => [p.id, p]));
    setSignups((list || []).map((s: any) => ({ ...s, profile: map.get(s.user_id) || null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (s: Signup, status: "approved" | "rejected") => {
    if (!user) return;
    const note = notes[s.id]?.trim() || null;
    const { error: updErr } = await supabase
      .from("sr_training_signups" as any)
      .update({ status, note, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", s.id);
    if (updErr) { toast.error(updErr.message); return; }
    if (status === "approved") {
      const { error: profErr } = await supabase.from("profiles").update({ has_sr_training: true } as any).eq("id", s.user_id);
      if (profErr) { toast.error(profErr.message); return; }
    }
    toast.success(status === "approved" ? "Anmeldung angenommen" : "Anmeldung abgelehnt");
    logActivity(
      status === "approved" ? "SR-Anmeldung angenommen" : "SR-Anmeldung abgelehnt",
      "admin",
      { target_user_id: s.user_id }
    );
    load();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Lade...</div>;

  const pending = signups.filter((s) => s.status === "pending");
  const reviewed = signups.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">SR-Ausbildung Anmeldungen</h2>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-wider">Offen ({pending.length})</h3>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Keine offenen Anmeldungen.</p>}
        {pending.map((s) => (
          <Card key={s.id} className="p-4 space-y-3 bg-card border-yellow-500/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{s.profile?.name || "Unbekannt"}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {s.profile?.internal_dienstnummer || s.profile?.dienstnummer || "–"} · angemeldet am {new Date(s.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 gap-1"><Clock className="w-3 h-3" /> Offen</Badge>
            </div>
            <Textarea
              placeholder="Notiz (optional, z. B. Begründung)"
              value={notes[s.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
              className="min-h-[60px] text-sm bg-background border-border"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => review(s, "approved")} className="gap-1.5">
                <Check className="w-4 h-4" /> Annehmen & Haken setzen
              </Button>
              <Button size="sm" variant="destructive" onClick={() => review(s, "rejected")} className="gap-1.5">
                <X className="w-4 h-4" /> Ablehnen
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Verlauf</h3>
          {reviewed.map((s) => (
            <Card key={s.id} className="p-3 bg-card border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-foreground flex items-center gap-2">
                  {s.profile?.name || "Unbekannt"}
                  {s.profile?.has_sr_training && <ShieldCheck className="w-4 h-4 text-primary" />}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {s.profile?.internal_dienstnummer || s.profile?.dienstnummer || "–"}
                  {s.note && ` · ${s.note}`}
                </p>
              </div>
              {s.status === "approved" ? (
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1"><Check className="w-3 h-3" /> Angenommen</Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/50 text-destructive gap-1"><X className="w-3 h-3" /> Abgelehnt</Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SRTrainingSignups;
