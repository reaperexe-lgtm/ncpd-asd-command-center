import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import asdLogo from "@/assets/asd-logo.png";

const toEmail = (dienstnummer: string) => `${dienstnummer.toLowerCase()}@asd.local`;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [dienstnummer, setDienstnummer] = useState("");
  const [password, setPassword] = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = toEmail(dienstnummer);
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Erfolgreich angemeldet!");
      } else {
        const fullName = `${vorname} ${nachname}`.trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: fullName, dienstnummer },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Registrierung erfolgreich! Bitte warte auf die Freischaltung.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={asdLogo} alt="ASD" className="w-24 h-24 rounded-full" />
          <h1 className="text-xl font-bold text-primary">Air Support Division</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Melde dich an" : "Erstelle ein Konto"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname</Label>
                  <Input id="vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Max" required className="bg-card border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname</Label>
                  <Input id="nachname" value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Mustermann" required className="bg-card border-border" />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="dienstnummer">Dienstnummer</Label>
            <Input id="dienstnummer" value={dienstnummer} onChange={(e) => setDienstnummer(e.target.value)} placeholder="DN-00" required className="bg-card border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-card border-border" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Laden..." : isLogin ? "Anmelden" : "Registrieren"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
            {isLogin ? "Registrieren" : "Anmelden"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
