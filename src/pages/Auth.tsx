import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import asdLogo from "@/assets/asd-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Erfolgreich angemeldet!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Registrierung erfolgreich! Bitte warte auf die Freischaltung durch einen Director/Co-Director.");
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
            <div className="space-y-2">
              <Label htmlFor="name">Name (IC)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" required className="bg-card border-border" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@beispiel.de" required className="bg-card border-border" />
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
