import { useState } from "react";
import SlideshowBackground from "@/components/SlideshowBackground";
import Changelog from "@/components/Changelog";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import asdLogo from "@/assets/asd-logo.png";
import { Shield, User, Lock, Hash, Plane, GraduationCap } from "lucide-react";
import TheoryExam from "@/components/TheoryExam";

const toEmail = (dienstnummer: string) => `${dienstnummer.toLowerCase()}@asd.local`;

const Auth = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showFlugAnmeldung, setShowFlugAnmeldung] = useState(false);
  const [isASDSignup, setIsASDSignup] = useState(false);
  const [isFlightSignup, setIsFlightSignup] = useState(false);
  const [dienstnummer, setDienstnummer] = useState("");
  const [password, setPassword] = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (user) {
    if (role === "asd_applicant") return <Navigate to="/asd-dashboard" replace />;
    if (role === "flight_applicant") return <Navigate to="/flight-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  if (showFlugAnmeldung) {
    return <TheoryExam onBack={() => setShowFlugAnmeldung(false)} />;
  }

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
            data: {
              name: fullName,
              dienstnummer,
              ...(isASDSignup ? { is_asd_applicant: true } : {}),
              ...(isFlightSignup ? { is_flight_applicant: true } : {}),
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(
          isASDSignup || isFlightSignup
            ? "Registrierung erfolgreich! Du kannst dich jetzt anmelden."
            : "Registrierung erfolgreich! Bitte warte auf die Freischaltung."
        );
        if (isASDSignup || isFlightSignup) {
          setIsASDSignup(false);
          setIsFlightSignup(false);
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <SlideshowBackground />

      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-start justify-center gap-8 relative">
      {/* Changelog - left side on desktop */}
      <div className="hidden lg:block w-80 flex-shrink-0 sticky top-8">
        <Changelog />
      </div>

      <div className="w-full max-w-md space-y-8 relative">
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
              {isFlightSignup
                ? "Registriere dich als Fluglizenz-Bewerber"
                : isASDSignup
                  ? "Registriere dich als ASD-Bewerber"
                  : isLogin
                    ? "Melde dich an, um fortzufahren"
                    : "Erstelle deinen Zugang"}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-primary/[0.03]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(!isLogin || isASDSignup || isFlightSignup) && (
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
              {loading
                ? "Laden..."
                : isFlightSignup
                  ? "Als Fluglizenz-Bewerber registrieren"
                  : isASDSignup
                    ? "Als ASD-Bewerber registrieren"
                    : isLogin
                      ? "Anmelden"
                      : "Registrieren"}
            </Button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => {
              setIsASDSignup(true);
              setIsFlightSignup(false);
              setIsLogin(false);
            }}
            className="inline-flex items-center gap-2 text-sm text-primary/80 hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 rounded-lg px-4 py-2 bg-card/50 backdrop-blur-sm"
          >
            <GraduationCap className="w-4 h-4" />
            ASD-Bewerber Registrierung
          </button>
          <button
            onClick={() => {
              setIsFlightSignup(true);
              setIsASDSignup(false);
              setIsLogin(false);
            }}
            className="inline-flex items-center gap-2 text-sm text-primary/80 hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 rounded-lg px-4 py-2 bg-card/50 backdrop-blur-sm"
          >
            <Plane className="w-4 h-4" />
            Fluglizenz-Bewerber Registrierung
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {(isASDSignup || isFlightSignup) ? (
            <button onClick={() => { setIsASDSignup(false); setIsFlightSignup(false); setIsLogin(true); }} className="text-primary hover:underline font-medium">
              Zurück zur Anmeldung
            </button>
          ) : (
            <>
              {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
                {isLogin ? "Registrieren" : "Anmelden"}
              </button>
            </>
          )}
        </p>
      </div>

      {/* Changelog - below on mobile */}
      <div className="lg:hidden w-full max-w-md">
        <Changelog />
      </div>
      </div>
    </div>
  );
};

export default Auth;
