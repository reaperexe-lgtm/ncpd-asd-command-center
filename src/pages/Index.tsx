import asdLogo from "@/assets/asd-logo.png";
import { demoMembers } from "@/lib/demoData";
import { ROLE_ORDER, ROLE_COLORS, type MemberRole } from "@/lib/types";

const Index = () => {
  const leitung = demoMembers.filter((m) =>
    ["Director", "Co-Director", "Supervisor"].includes(m.role)
  );
  const ausbilder = demoMembers.filter((m) =>
    ["Ausbilder", "Trial-Ausbilder"].includes(m.role)
  );
  const mitglieder = demoMembers.filter((m) => m.role === "Member");
  const trials = demoMembers.filter((m) => m.role === "Trial Member");

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Logo */}
      <div className="mt-4 w-40 h-40 rounded-full border-2 border-border p-2 shadow-[0_0_30px_hsl(185_100%_50%/0.08)]">
        <img src={asdLogo} alt="ASD Logo" className="w-full h-full object-contain rounded-full" />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <StatBox label="Gesamt Einsätze" value="54" />
        <StatBox label="Heute erstellt" value="0" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary tracking-tight">
          Einsatzprotokoll Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Aus der Luft. Für den Boden. (Späzi für die A.S.D!)
        </p>
      </div>

      {/* Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Leitung */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-bold text-primary mb-4">Air Support Division – Leitung</h2>
          
          <SectionLabel emoji="👑" label="Leitung" />
          {leitung.map((m) => (
            <MemberLine key={m.id} name={m.name} role={m.role} />
          ))}

          <SectionLabel emoji="⭐" label="Ausbilder" className="mt-4" />
          {ausbilder.map((m) => (
            <MemberLine key={m.id} name={m.name} role={m.role} />
          ))}
        </div>

        {/* Mitglieder */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-bold text-primary mb-4">Air Support Division – Mitglieder</h2>
          
          <SectionLabel emoji="👥" label="Mitglied" />
          {mitglieder.map((m) => (
            <MemberLine key={m.id} name={m.name} role={m.role} prefix="A.S.D · Mitglied:" />
          ))}

          <SectionLabel emoji="🔴" label="Trial" className="mt-4" />
          {trials.map((m) => (
            <MemberLine key={m.id} name={m.name} role={m.role} prefix="A.S.D · Trial:" />
          ))}
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card border border-border rounded-md px-6 py-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
  </div>
);

const SectionLabel = ({ emoji, label, className = "" }: { emoji: string; label: string; className?: string }) => (
  <p className={`text-sm font-semibold text-secondary-foreground flex items-center gap-1.5 ${className}`}>
    <span>{emoji}</span> {label}
  </p>
);

const MemberLine = ({ name, role, prefix }: { name: string; role: MemberRole; prefix?: string }) => (
  <p className={`text-sm pl-5 py-0.5 ${ROLE_COLORS[role]}`}>
    {prefix ? `${prefix} ${name}` : `${role}: ${name}`}
  </p>
);

export default Index;
