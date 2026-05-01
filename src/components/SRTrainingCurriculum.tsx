import { SR_CURRICULUM, SR_ROLES, SrModule, SrSection, SrStage } from "@/lib/srCurriculum";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Building2, ScrollText, Users, AlertTriangle, Crosshair, ShieldAlert, MapPin } from "lucide-react";

type Props = {
  completed: Set<string>;
  onToggle?: (code: string, value: boolean) => void;
  readOnly?: boolean;
};

const stageIcons: Record<string, React.ReactNode> = {
  "stage-1": <GraduationCap className="w-5 h-5" />,
  "stage-2": <Building2 className="w-5 h-5" />,
  "stage-3": <ScrollText className="w-5 h-5" />,
};

const SRTrainingCurriculum = ({ completed, onToggle, readOnly }: Props) => {
  const totalModules = SR_CURRICULUM.flatMap((s) => s.sections.flatMap((sec) => sec.modules)).length;
  const doneCount = SR_CURRICULUM.flatMap((s) => s.sections.flatMap((sec) => sec.modules)).filter((m) => completed.has(m.code)).length;
  const percent = totalModules ? Math.round((doneCount / totalModules) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-base font-bold text-foreground">Gesamtfortschritt</h2>
          <Badge variant="outline" className="border-primary/40 text-primary">
            {doneCount} / {totalModules} Module · {percent}%
          </Badge>
        </div>
        <Progress value={percent} className="h-2" />
      </Card>

      {SR_CURRICULUM.map((stage) => {
        const stageMods = stage.sections.flatMap((s) => s.modules);
        const stageDone = stageMods.filter((m) => completed.has(m.code)).length;
        return (
          <StageBlock
            key={stage.id}
            stage={stage}
            icon={stageIcons[stage.id]}
            doneCount={stageDone}
            totalCount={stageMods.length}
            completed={completed}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        );
      })}

      {/* Detailtheorie für Stufe 2.1 */}
      <TheoryDetails />

      {/* SR-Rollen */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Anhang</p>
            <h3 className="font-semibold text-foreground">Rollen innerhalb der SR-Einheit</h3>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {SR_ROLES.map((r) => (
            <div key={r.role} className="border border-border rounded-lg p-3 bg-muted/10">
              <p className="font-semibold text-primary text-sm">{r.role}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const StageBlock = ({
  stage, icon, doneCount, totalCount, completed, onToggle, readOnly,
}: {
  stage: SrStage; icon: React.ReactNode; doneCount: number; totalCount: number;
  completed: Set<string>; onToggle?: (code: string, value: boolean) => void; readOnly?: boolean;
}) => (
  <div className="border border-border rounded-xl bg-card overflow-hidden">
    <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{stage.title}</h3>
          {stage.subtitle && <p className="text-xs text-muted-foreground">{stage.subtitle}</p>}
        </div>
      </div>
      <Badge variant="outline" className="border-primary/40 text-primary">{doneCount}/{totalCount}</Badge>
    </div>
    <div className="p-5 space-y-5">
      {stage.sections.map((sec) => (
        <SectionBlock key={sec.title} section={sec} completed={completed} onToggle={onToggle} readOnly={readOnly} />
      ))}
    </div>
  </div>
);

const SectionBlock = ({
  section, completed, onToggle, readOnly,
}: { section: SrSection; completed: Set<string>; onToggle?: (code: string, value: boolean) => void; readOnly?: boolean }) => (
  <div className="border-l-2 border-primary/30 pl-4 space-y-2">
    <h4 className="font-medium text-foreground text-sm">◆ {section.title}</h4>
    <ul className="space-y-2">
      {section.modules.map((m) => (
        <ModuleRow key={m.code} module={m} checked={completed.has(m.code)} onToggle={onToggle} readOnly={readOnly} />
      ))}
    </ul>
  </div>
);

const ModuleRow = ({
  module: m, checked, onToggle, readOnly,
}: { module: SrModule; checked: boolean; onToggle?: (code: string, value: boolean) => void; readOnly?: boolean }) => (
  <li className="flex items-start gap-3 text-sm">
    <Checkbox
      checked={checked}
      disabled={readOnly || !onToggle}
      onCheckedChange={(v) => onToggle?.(m.code, !!v)}
      className="mt-0.5 h-5 w-5"
    />
    <div className="flex-1">
      <span className="font-mono text-[10px] text-primary mr-2">{m.code}</span>
      <span className={checked ? "text-foreground line-through opacity-70" : "text-foreground"}>{m.label}</span>
      {m.detail && <span className="text-muted-foreground"> · {m.detail}</span>}
    </div>
  </li>
);

const TheoryDetails = () => (
  <div className="border border-border rounded-xl bg-card overflow-hidden">
    <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
        <ShieldAlert className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Theorie-Detail</p>
        <h3 className="font-semibold text-foreground">Vertiefung: Urban Operations Theorie</h3>
      </div>
    </div>
    <div className="p-5 space-y-5">
      <TheoryBlock title="Gebäudestruktur & statische Gefahren" icon={<AlertTriangle className="w-4 h-4" />}>
        <p>Beim Anflug und bei Landungen auf Gebäuden trägt der Pilot eine hohe Verantwortung – schon kleine Fehler können zu schweren Unfällen führen.</p>
        <BulletGroup title="Dachlast & Tragfähigkeit" items={[
          "Glasdächer", "Leichte Metallkonstruktionen", "Flachdächer mit Kies / instabilen Aufbauten",
        ]} />
        <BulletGroup title="Statische Aufbauten" items={[
          "Klimaanlagen", "Lüftungsschächte", "Antennen", "Treppenaufbauten", "Geländer / Lichtschächte",
        ]} />
        <BulletGroup title="Gefahren durch Windkanäle" items={[
          "Dachkanten erzeugen Aufwinde / Abrisskanten",
          "Helikopter wird bei geringer Höhe destabilisiert",
        ]} />
        <BulletGroup title="Strukturelle Schwachstellen" items={[
          "Visuell prüfen: keine Schäden, Einsturzgefahr oder brüchigen Bereiche",
        ]} />
      </TheoryBlock>

      <TheoryBlock title="Rotorradius & Hinderniserkennung" icon={<Crosshair className="w-4 h-4" />}>
        <BulletGroup title="Rotordurchmesser + Sicherheitsabstand" items={[
          "3–5 Meter Sicherheitszone zusätzlich einplanen",
        ]} />
        <BulletGroup title="360° Hinderniserkennung" items={[
          "Masten, Antennen, Stromleitungen", "Aufbauten, Bäume, andere Gebäude",
        ]} />
        <BulletGroup title="Vertikale Hindernisse" items={[
          "Schornsteine", "Kräne", "Dachkanten",
        ]} />
        <BulletGroup title="Helikopterneigung" items={[
          "Leichte Neigung im Schwebeflug = Gefahr für Rotor an Hindernissen",
        ]} />
      </TheoryBlock>

      <TheoryBlock title="Sicherheitszonen (Hot / Warm / Safe Zone)" icon={<ShieldAlert className="w-4 h-4" />}>
        <ZoneRow color="bg-red-500" name="Hot Zone" desc="Unmittelbarer Gefahrenbereich – starker Downwash, Rotorgefahr, nur eingesetztes SR-Team." />
        <ZoneRow color="bg-yellow-500" name="Warm Zone" desc="Zwischenzone für Spotter / SR-Operator zur Koordination." />
        <ZoneRow color="bg-green-500" name="Safe Zone" desc="Außerhalb der Rotorgefahr – Crew & Zivilisten, Sammeln von Material/Patienten." />
        <p className="text-xs text-muted-foreground italic mt-2">Zonen müssen vor jeder Landung angekündigt, bestätigt und gesichert werden.</p>
      </TheoryBlock>

      <TheoryBlock title="Aufsetzpunkte analysieren" icon={<MapPin className="w-4 h-4" />}>
        <BulletGroup title="Untergrund" items={[
          "Stabil, eben, keine losen Gegenstände",
          "Keine weichen Flächen (Teerdächer, Kies, Metallgitter)",
        ]} />
        <BulletGroup title="Platzbedarf" items={[
          "Ausreichende Fläche für Helikopter + Sicherheitsbereich",
          "Keine Hindernisse in Rotornähe",
        ]} />
        <BulletGroup title="Wind" items={[
          "Möglichst gegen den Wind landen",
          "Seitenwind vermeiden – destabilisiert den Heli",
        ]} />
        <BulletGroup title="Fluchtwege" items={[
          "Möglichkeit zum Notabflug",
          "SR-Personal kann sich sicher entfernen",
        ]} />
        <BulletGroup title="Gefahrenanalyse" items={[
          "Mögliche Einsturzpunkte",
          "Lockere / bewegliche Bauteile",
          "Nahe Hindernisse beim Abheben",
        ]} />
        <BulletGroup title="Sichtverhältnisse" items={[
          "Ausreichende Beleuchtung",
          "Klare Erkennungsmerkmale",
          "Keine Blendung durch Gebäudelichter",
        ]} />
      </TheoryBlock>
    </div>
  </div>
);

const TheoryBlock = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="border-l-2 border-primary/30 pl-4 space-y-3">
    <h4 className="font-medium text-foreground text-sm flex items-center gap-2 text-primary">{icon} {title}</h4>
    <div className="text-sm text-muted-foreground space-y-3">{children}</div>
  </div>
);

const BulletGroup = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <p className="text-xs font-semibold text-foreground mb-1">{title}</p>
    <ul className="space-y-1 ml-4">
      {items.map((i) => <li key={i} className="text-xs">– {i}</li>)}
    </ul>
  </div>
);

const ZoneRow = ({ color, name, desc }: { color: string; name: string; desc: string }) => (
  <div className="flex items-start gap-3">
    <span className={`inline-block w-3 h-3 rounded-full ${color} mt-1 shrink-0`} />
    <div>
      <span className="font-semibold text-foreground text-sm">{name}: </span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </div>
  </div>
);

export default SRTrainingCurriculum;
