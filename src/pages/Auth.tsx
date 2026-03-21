import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import asdLogo from "@/assets/asd-logo.png";
import { Shield, User, Lock, Hash } from "lucide-react";

const toEmail = (dienstnummer: string) => `${dienstnummer.toLowerCase()}@asd.local`;

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [dienstnummer, setDienstnummer] = useState("");
  const [password, setPassword] = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (user) return <Navigate to="/" replace />;

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      <div className="w-full max-w-md space-y-8 relative">
        {/* Logo area */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-2 border-primary/30 p-1.5 shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
              <img src={asdLogo} alt="ASD" className="w-full h-full object-contain rounded-full" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary tracking-tight">Air Support Division</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "Melde dich an, um fortzufahren" : "Erstelle deinen Zugang"}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-primary/[0.03]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vorname" className="text-xs">Vorname</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Max" required className="bg-background border-border pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname" className="text-xs">Nachname</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="nachname" value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Mustermann" required className="bg-background border-border pl-9" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dienstnummer" className="text-xs">Dienstnummer</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="dienstnummer" value={dienstnummer} onChange={(e) => setDienstnummer(e.target.value)} placeholder="DN-00" required className="bg-background border-border pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-background border-border pl-9" />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? "Laden..." : isLogin ? "Anmelden" : "Registrieren"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
            {isLogin ? "Registrieren" : "Anmelden"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
