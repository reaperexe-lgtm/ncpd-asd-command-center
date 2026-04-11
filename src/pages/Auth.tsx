import { useState } from "react";
import SlideshowBackground from "@/components/SlideshowBackground";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import asdLogo from "@/assets/asd-logo.png";
import { Shield, User, Lock, Hash, Plane, ArrowLeft } from "lucide-react";

const toEmail = (dienstnummer: string) => `${dienstnummer.toLowerCase()}@asd.local`;

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf0FUd-WLfyK9VFye_16Hyp8ge_Nl4dE372XU8gws388vz1lg/viewform";

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showFlugAnmeldung, setShowFlugAnmeldung] = useState(false);
  const [dienstnummer, setDienstnummer] = useState("");
  const [password, setPassword] = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [loading, setLoading] = useState(false);

  // Fluglizenz form state
  const [flugName, setFlugName] = useState("");
  const [flugDienstnummer, setFlugDienstnummer] = useState("");
  const [flugSubmitted, setFlugSubmitted] = useState(false);

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

  const handleFlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flugName.trim() || !flugDienstnummer.trim()) {
      toast.error("Bitte fülle alle Felder aus.");
      return;
    }
    setFlugSubmitted(true);
  };

  // Fluglizenz Anmeldung view
  if (showFlugAnmeldung) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <SlideshowBackground />
        <div className="w-full max-w-md space-y-8 relative">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-2 border-primary/30 p-1.5 shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
                <img src={asdLogo} alt="ASD" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Plane className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary tracking-tight">Fluglizenzen Anmeldung</h1>
              <p className="text-sm text-muted-foreground mt-1">A.S.D Theorieprüfung</p>
            </div>
          </div>

          {!flugSubmitted ? (
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-primary/[0.03]">
              <form onSubmit={handleFlugSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="flugName" className="text-xs">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="flugName" value={flugName} onChange={(e) => setFlugName(e.target.value)} placeholder="Vor- und Nachname" required className="bg-background border-border pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flugDienstnummer" className="text-xs">Dienstnummer</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="flugDienstnummer" value={flugDienstnummer} onChange={(e) => setFlugDienstnummer(e.target.value)} placeholder="DN-00" required className="bg-background border-border pl-9" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold">
                  Weiter zum Fragebogen
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg shadow-primary/[0.03]">
              <div className="p-4 border-b border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{flugName}</span> · {flugDienstnummer}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Bestanden ab 11-15 Punkten</p>
              </div>
              <iframe
                src={`${GOOGLE_FORM_URL}?entry.1677498625=${encodeURIComponent(flugDienstnummer)}&entry.1040aborar=${encodeURIComponent(flugName)}&embedded=true`}
                width="100%"
                height="500"
                className="border-0"
                title="A.S.D Theorieprüfung"
              >
                Laden...
              </iframe>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <button onClick={() => { setShowFlugAnmeldung(false); setFlugSubmitted(false); }} className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Zurück zur Anmeldung
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <SlideshowBackground />

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

        {/* Fluglizenz button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowFlugAnmeldung(true)}
            className="inline-flex items-center gap-2 text-sm text-primary/80 hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 rounded-lg px-4 py-2 bg-card/50 backdrop-blur-sm"
          >
            <Plane className="w-4 h-4" />
            Fluglizenzen Anmeldung
          </button>
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
