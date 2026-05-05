import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeOff } from "lucide-react";
import { toast } from "sonner";

const ALLOWED = new Set(["admin", "director", "supervisor"]);

export default function HiddenMapPasswordSection({ currentRole }: { currentRole: string | null }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const allowed = ALLOWED.has(currentRole || "");

  useEffect(() => {
    if (!allowed) return;
    supabase.from("map_hidden_password").select("password").maybeSingle().then(({ data }) => {
      if (data?.password) setPassword(data.password);
    });
  }, [allowed]);

  if (!allowed) return null;

  const save = async () => {
    setLoading(true);
    const { data: existing } = await supabase.from("map_hidden_password").select("id").maybeSingle();
    const { error } = existing
      ? await supabase.from("map_hidden_password").update({ password, updated_at: new Date().toISOString() }).eq("id", existing.id)
      : await supabase.from("map_hidden_password").insert({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Passwort gespeichert");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
        <EyeOff className="w-4 h-4" /> Passwort: Versteckte Karten-Punkte
      </h2>
      <p className="text-xs text-muted-foreground">
        Nur Admin, Director und Supervisor sehen dieses Passwort. Es wird zum Freischalten der versteckten Punkte/Gebiete in der Ortskunde benutzt.
      </p>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label>Passwort</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="z.B. RouteG3h3im" />
        </div>
        <Button onClick={save} disabled={loading}>Speichern</Button>
      </div>
    </div>
  );
}