import {
  LifeBuoy, ShieldCheck, ClipboardList, Users, Plane,
  Heart, Building2, Wind, AlertTriangle, Lock, CheckCircle2
} from "lucide-react";

const SearchAndRescueContent = () => {
  return (
    <div className="space-y-8">
      <Section step={1} title="Was ist SR (Search & Rescue)?" icon={<LifeBuoy className="w-5 h-5" />}>
        <p className="text-sm text-muted-foreground">
          SR ist die <strong className="text-foreground">Spezialeinheit der ASD</strong>, die für
          Personenbergung, medizinische Luftrettung und kritische Haus-/Dachlandungen verantwortlich ist.
          SR-Piloten führen Einsätze durch, die normale Piloten nicht gewährleisten können.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground mt-3">
          <li>● Bergungen in unwegsamem Gelände</li>
          <li>● Rettungen aus urbanen Bereichen</li>
          <li>● Absetzen und Aufnehmen von Spottern</li>
          <li>● Unterstützung von Polizei- und Notfalleinsätzen</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-3">
          Um diese Aufgaben zu erfüllen, müssen SR-Piloten <strong className="text-foreground">präzise, ruhig und hochprofessionell</strong> fliegen.
        </p>
      </Section>

      <Section step={2} title="Voraussetzungen für SR-Piloten" icon={<ShieldCheck className="w-5 h-5" />}>
        <SubSection title="ASD-Pilot Grundzertifizierung (zwingend)">
          <p className="text-sm text-muted-foreground mb-2">
            Diese bescheinigt, dass der Pilot grundlegende Flugfähigkeiten sicher beherrscht:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✔ Starten</li>
            <li>✔ Landen</li>
            <li>✔ Stabil fliegen</li>
            <li>✔ Instrumente verstehen</li>
            <li>✔ Notverfahren (z. B. Autorotation)</li>
          </ul>
          <p className="text-sm text-red-400 mt-3 font-medium">
            Ohne diese Lizenz ist keine Spezialisierung möglich.
          </p>
        </SubSection>
      </Section>

      <Section step={3} title="SOPs – Standard Operating Procedures" icon={<ClipboardList className="w-5 h-5" />}>
        <p className="text-sm text-muted-foreground">
          SOPs sind <strong className="text-foreground">festgelegte, standardisierte Einsatzabläufe</strong>,
          die von allen ASD-/SR-Piloten eingehalten werden müssen.
        </p>
        <SubSection title="Warum SOPs existieren">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Einheitliche Arbeitsweise</li>
            <li>● Minimierung von Fehlern</li>
            <li>● Erhöhung der Sicherheit</li>
            <li>● Klar definierte Rollen und Schritte</li>
            <li>● Orientierung in Stresssituationen</li>
          </ul>
        </SubSection>
        <p className="text-sm text-muted-foreground italic">
          Kurz gesagt: SOPs bestimmen, wie jeder Pilot eine Aufgabe korrekt durchführt.
        </p>
      </Section>

      <Section step={4} title="Rollenverteilung im SR-Team" icon={<Users className="w-5 h-5" />}>
        <SubSection title="Pilot">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Steuert den Helikopter</li>
            <li>● Verantwortlich für Sicherheit & Stabilität</li>
            <li>● Führt Anflüge, Landungen und Schwebeflug aus</li>
          </ul>
        </SubSection>
        <SubSection title="Spotter">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Beobachtet Umgebung, Hindernisse, Rotorabstand</li>
            <li>● Unterstützt Pilot durch klare Ansagen</li>
            <li>● Gibt Freigaben wie <strong className="text-foreground">„Clear"</strong> oder Warnungen durch</li>
            <li>● Rettet die Patienten</li>
          </ul>
        </SubSection>
        <p className="text-sm text-muted-foreground italic">
          Diese Kommunikation ist essenziell für jede SR-Mission.
        </p>
      </Section>

      <Section step={5} title="Grundlagen des SR-Fluges" icon={<Plane className="w-5 h-5" />}>
        <SubSection title="5.1 Schwebeflug">
          <p className="text-sm text-muted-foreground mb-2">
            Der Schwebeflug ist die <strong className="text-foreground">wichtigste Fähigkeit</strong> im SR-Bereich.
            Er wird benötigt für:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Personenbergungen</li>
            <li>● Absetzen der Spotter</li>
            <li>● Arbeiten über engen oder gefährlichen Bereichen</li>
            <li>● Positionieren über Dächern</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3 mb-2">Ein stabiler Schwebeflug bedeutet:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✔ Keine seitliche Drift</li>
            <li>✔ Ruhige Höhenkontrolle</li>
            <li>✔ Saubere Rotorposition</li>
            <li>✔ Ständige Kommunikation mit dem Team</li>
          </ul>
          <p className="text-sm text-primary mt-3 font-medium">
            Je besser der Schwebeflug, desto sicherer die Rettung.
          </p>
        </SubSection>
      </Section>

      <Section step={6} title="Menschenbergung (Search & Rescue)" icon={<Heart className="w-5 h-5" />}>
        <SubSection title="6.1 Ablauf">
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Einsatzgebiet aus sicherer Höhe sichten</li>
            <li>Hindernisse erkennen (Bäume, Strommasten, Felsen, Gebäude)</li>
            <li>Pilot geht in stabilen Schwebeflug über der Zielperson</li>
            <li>Spotter wird abgesetzt</li>
            <li>Spotter versorgt und sichert den Patienten</li>
            <li>Spotter gibt Freigabe zur Aufnahme</li>
            <li>Patient wird kontrolliert aufgenommen</li>
            <li>Helikopter steigt sicher aus dem Gebiet aus</li>
          </ol>
        </SubSection>
        <SubSection title="6.2 Prioritäten">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Sicherheit von Team & Patienten</li>
            <li>● Stabiler Flug</li>
            <li>● Präzise Kommunikation</li>
          </ul>
        </SubSection>
      </Section>

      <Section step={7} title="Urban Operations – Haus- & Dachlandungen" icon={<Building2 className="w-5 h-5" />}>
        <SubSection title="7.1 Gefahrenquellen">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Antennen</li>
            <li>● Klimaanlagen</li>
            <li>● Kanten</li>
            <li>● Enge Landezonen</li>
            <li>● Windverwirbelungen („Windkanäle")</li>
          </ul>
        </SubSection>
        <SubSection title="7.2 Vorbereitung einer Dachlandung">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Das Dach aus der Luft prüfen</li>
            <li>● Windrichtung beachten</li>
            <li>● Hindernisse identifizieren</li>
            <li>● Vom Spotter die Freigabe („Clear") einholen</li>
          </ul>
        </SubSection>
        <SubSection title="7.3 Durchführung">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>● Ständige Kommunikation mit dem Spotter</li>
            <li>● Ruhiges Absetzen ohne Schlagbewegungen</li>
            <li>● Nach dem Aufsetzen Rotor laufen lassen, bis Spotter „Clear" gibt</li>
          </ul>
        </SubSection>
      </Section>

      <Section step={8} title="Wetter- & Windsituationen" icon={<Wind className="w-5 h-5" />}>
        <p className="text-sm text-muted-foreground mb-3">
          Wind ist einer der größten Einflussfaktoren bei SR-Landungen:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>● <strong className="text-foreground">Seitenwind</strong> kann Helikopter versetzen</li>
          <li>● <strong className="text-foreground">Rückenwind</strong> erzeugt Instabilität</li>
          <li>● <strong className="text-foreground">Gegenwind</strong> erleichtert kontrollierten Anflug</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-3 italic">
          Piloten müssen ständig gegensteuern und die Maschine ausgleichen.
        </p>
      </Section>

      <Section step={9} title="Notfallverfahren – Autorotation" icon={<AlertTriangle className="w-5 h-5" />}>
        <p className="text-sm text-muted-foreground">
          Eine <strong className="text-foreground">Autorotation</strong> wird durchgeführt, wenn das Triebwerk ausfällt.
        </p>
        <SubSection title="Prinzip">
          <p className="text-sm text-muted-foreground">
            Der Helikopter nutzt die Luftströmung, um die Rotorblätter passiv weiterdrehen zu lassen.
            Damit kann der Pilot eine kontrollierte Notlandung durchführen.
          </p>
        </SubSection>
        <p className="text-sm text-primary font-medium">
          Dies gehört zum Pflichtwissen jedes ASD- und SR-Piloten.
        </p>
      </Section>

      <Section step={10} title="Sicherheitsregeln für SR-Piloten" icon={<Lock className="w-5 h-5" />}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>● Rotor <strong className="text-foreground">niemals abstellen</strong>, bevor das Team „Clear" meldet</li>
          <li>● Nie ohne Sicht landen</li>
          <li>● Anflüge immer langsam und kontrolliert</li>
          <li>● Keine riskanten Manöver mit Personen am Boden</li>
          <li>● Kommunikation hat oberste Priorität</li>
        </ul>
      </Section>

      <Section step={11} title="Zusammenfassung (für die Prüfung)" icon={<CheckCircle2 className="w-5 h-5" />}>
        <p className="text-sm text-muted-foreground mb-3">
          Wenn der Anwärter folgendes verstanden hat, besteht er die theoretische Prüfung:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✔ Was SR bedeutet (Search & Rescue)</li>
          <li>✔ Wichtigkeit der Grundzertifizierung</li>
          <li>✔ Was SOPs sind</li>
          <li>✔ Aufgaben von Pilot & Spotter</li>
          <li>✔ Bedeutung von Schwebeflug</li>
          <li>✔ Ablauf einer Personenbergung</li>
          <li>✔ Gefahren bei Dachlandungen</li>
          <li>✔ Autorotation = Notlandeverfahren bei Triebwerksausfall</li>
          <li>✔ Wann der Rotor abgestellt werden darf</li>
          <li>✔ Warum Wind & Hindernisse entscheidend sind</li>
        </ul>
      </Section>
    </div>
  );
};

const Section = ({ step, title, icon, children }: { step: number; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="border border-border rounded-xl bg-card overflow-hidden">
    <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Kapitel {step}</p>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
    </div>
    <div className="p-5 space-y-4">
      {children}
    </div>
  </div>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-l-2 border-primary/30 pl-4 space-y-2">
    <h4 className="font-medium text-foreground text-sm">◆ {title}</h4>
    {children}
  </div>
);

export default SearchAndRescueContent;
