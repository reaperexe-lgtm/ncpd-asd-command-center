import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import asdLogo from "@/assets/asd-logo.png";

const ROLE_LABELS: Record<string, string> = {
  director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
};
const ROLE_COLORS: Record<string, string> = {
  director: "text-red-400", co_director: "text-orange-400", supervisor: "text-yellow-400",
  ausbilder: "text-amber-300", trial_ausbilder: "text-lime-400", member: "text-primary", trial_member: "text-purple-400",
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  Staatsbank: "Staatsbank", Juwelier: "Juwelier", "Human Labs": "Human Labs",
  Geiselnahme: "Geiselnahme", Razzia: "Razzia", Panikbutton: "Panikbutton",
};

const Index = () => {
  const [easterEgg, setEasterEgg] = useState(false);
  const [missionDialog, setMissionDialog] = useState<"all" | "today" | null>(null);

  const { data: members } = useQuery({
    queryKey: ["home-members"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").eq("is_approved", true);
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || "trial_member",
      }));
    },
  });

  const { data: missions } = useQuery({
    queryKey: ["home-missions-full"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("id, created_at, location_type, description, tatzeit, protokollschreiber").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-map-home"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name");
      return data || [];
    },
  });

  const profileName = (id: string) => profiles?.find((p) => p.id === id)?.name || "Unbekannt";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMissions = missions?.filter((m) => new Date(m.created_at) >= todayStart) || [];
  const todayCount = todayMissions.length;

  const dialogMissions = missionDialog === "today" ? todayMissions : missions || [];

  const ROLE_ORDER = ["director","co_director","supervisor","ausbilder","trial_ausbilder","member","trial_member"];
  const sortByRole = (a: any, b: any) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
  const leitung = (members?.filter((m) => ["director","co_director","supervisor"].includes(m.role)) || []).sort(sortByRole);
  const ausbilder = (members?.filter((m) => ["ausbilder","trial_ausbilder"].includes(m.role)) || []).sort(sortByRole);
  const mitglieder = members?.filter((m) => m.role === "member") || [];
  const trials = members?.filter((m) => m.role === "trial_member") || [];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-8 relative">
      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-8 w-full pb-4 sm:pb-8">
      <div className="mt-2 sm:mt-4 w-28 h-28 sm:w-48 sm:h-48 rounded-full border-2 border-border overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
        <img src={asdLogo} alt="ASD Logo" className="w-full h-full object-cover rounded-full scale-125" />
      </div>

      <div className="flex gap-3 sm:gap-4">
        <button onClick={() => setMissionDialog("all")} className="bg-card border border-border rounded-md px-4 py-2 sm:px-6 sm:py-3 hover:bg-accent transition-colors cursor-pointer text-left">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Gesamt Einsätze</p>
          <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{missions?.length || 0}</p>
        </button>
        <button onClick={() => setMissionDialog("today")} className="bg-card border border-border rounded-md px-4 py-2 sm:px-6 sm:py-3 hover:bg-accent transition-colors cursor-pointer text-left">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Heute erstellt</p>
          <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{todayCount}</p>
        </button>
      </div>

      {/* Mission List Dialog */}
      <Dialog open={!!missionDialog} onOpenChange={(open) => !open && setMissionDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {missionDialog === "today" ? "Heutige Einsätze" : "Alle Einsätze"} ({dialogMissions.length})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {dialogMissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine Einsätze vorhanden</p>
            ) : (
              dialogMissions.map((m: any) => (
                <div key={m.id} className="bg-background border border-border rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">{m.location_type}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(m.created_at)}</span>
                  </div>
                  {m.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{m.description}</p>
                  )}
                  {m.protokollschreiber && (
                    <p className="text-[10px] text-muted-foreground">📝 {profileName(m.protokollschreiber)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="text-center px-2">
        <h1 className="text-xl sm:text-3xl font-bold text-primary tracking-tight">Einsatzprotokoll Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Aus der Luft. Für den Boden
          <span 
            onClick={() => setEasterEgg(true)} 
            className="cursor-pointer select-none hover:text-primary hover:scale-125 inline-block transition-all duration-300"
          >.</span> (Späzi für die A.S.D!)
        </p>
      </div>

      <Dialog open={easterEgg} onOpenChange={setEasterEgg}>
        <DialogContent className="max-w-[70vw] sm:max-w-sm p-1 bg-black border-border [&>button]:text-white [&>button]:bg-black/60 [&>button]:rounded-full [&>button]:z-10">
          <video
            src="https://qfstjmzklpnftoablrss.supabase.co/storage/v1/object/public/assets/easteregg.mp4"
            autoPlay
            controls
            playsInline
            className="w-full rounded"
            ref={(el) => { if (el) el.volume = 0.1; }}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl">
        <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
          <h2 className="font-bold text-primary mb-4">Air Support Division – Leitung</h2>
          <SectionLabel emoji="👑" label="Leitung" />
          {leitung.map((m) => <MemberLine key={m.id} name={m.name} role={m.role} />)}
          <SectionLabel emoji="⭐" label="Ausbilder" className="mt-4" />
          {ausbilder.map((m) => <MemberLine key={m.id} name={m.name} role={m.role} />)}
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
          <h2 className="font-bold text-primary mb-4">Air Support Division – Mitglieder</h2>
          <SectionLabel emoji="👥" label="Mitglied" />
          {mitglieder.map((m) => <MemberLine key={m.id} name={m.name} role={m.role} prefix="A.S.D · Mitglied:" />)}
          <SectionLabel emoji="🔴" label="Trial" className="mt-4" />
          {trials.map((m) => <MemberLine key={m.id} name={m.name} role={m.role} prefix="A.S.D · Trial:" />)}
          {members?.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Mitglieder.</p>}
        </div>
      </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ emoji, label, className = "" }: { emoji: string; label: string; className?: string }) => (
  <p className={`text-sm font-semibold text-secondary-foreground flex items-center gap-1.5 ${className}`}>
    <span>{emoji}</span> {label}
  </p>
);

const MemberLine = ({ name, role, prefix }: { name: string; role: string; prefix?: string }) => (
  <p className={`text-sm pl-5 py-0.5 ${ROLE_COLORS[role] || "text-primary"}`}>
    {prefix ? `${prefix} ${name}` : `${ROLE_LABELS[role] || role}: ${name}`}
  </p>
);

export default Index;
