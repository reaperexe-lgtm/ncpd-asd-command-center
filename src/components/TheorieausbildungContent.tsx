import landezonenImg from "@/assets/theorie-landezonen.png";
import { Separator } from "@/components/ui/separator";
import {
  Plane, Eye, Radio, Users, MapPin, Map
} from "lucide-react";

const TheorieausbildungContent = () => {
  return (
    <div className="space-y-8">
      {/* 1. Aufbau des JCON-Overwatch */}
      <Section step={1} title="Aufbau des JCON-Overwatch" icon={<Plane className="w-5 h-5" />}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Bezeichnung:</strong> Overwatch (OW)</li>
          <li><strong className="text-foreground">Sitzplätze:</strong> 4 (2 vorne, 2 hinten)</li>
          <li><strong className="text-foreground">Ausstattung:</strong>
            <ul className="ml-6 mt-1 space-y-1">
              <li>○ 2 Seilwinden (je eine pro Seite)</li>
              <li>○ 2 Rotoren (Haupt- und Heckrotor)</li>
              <li>○ Hochleistungs-Kamerasystem mit Tag-/Nachtsichtfunktion</li>
            </ul>
          </li>
        </ul>
      </Section>

      {/* 2. Aufgaben der Overwatch-Einheit */}
      <Section step={2} title="Aufgaben der Overwatch-Einheit" icon={<Eye className="w-5 h-5" />}>
        <div className="space-y-5">
          <SubSection title="2.1 Beobachtung & Aufklärung">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Erstellung eines Lagebilds bei <strong className="text-foreground">Geiselnahmen</strong>, <strong className="text-foreground">Raubüberfällen</strong> oder ähnlichen Einsatzlagen</li>
              <li>● Unterstützung der <strong className="text-foreground">Einsatzleitung</strong> durch Echtzeitinformationen aus der Luft</li>
            </ul>
          </SubSection>

          <SubSection title="2.2 Verfolgungsjagden">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Luftunterstützung bei <strong className="text-foreground">Fahrzeug- und Personenverfolgungen</strong></li>
              <li>● Kontinuierliche Funkdurchgaben (10-20 Meldungen pro Verfolgung)</li>
            </ul>
          </SubSection>

          <SubSection title="2.3 Fahndungsunterstützung">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Erfassung und Überprüfung von <strong className="text-foreground">Kennzeichen</strong></li>
              <li>● Abgleich mit <strong className="text-foreground">Fahndungsdatenbanken</strong></li>
            </ul>
          </SubSection>

          <SubSection title="2.4 Überwachung des öffentlichen Verkehrsraums">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Aufklärung aus der Luft nach <strong className="text-foreground">auffälligen Fahrzeugen</strong></li>
              <li>● Weitergabe an Streifen für gezielte <strong className="text-foreground">10-60-Kontrollen</strong></li>
            </ul>
          </SubSection>

          <SubSection title="2.5 Suche und Rettung">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Lokalisierung von <strong className="text-foreground">verletzten oder bewusstlosen Personen</strong>, insbesondere nach Schusswechseln oder Unfällen</li>
            </ul>
          </SubSection>

          <SubSection title="2.6 Unterstützung bei Schusswechseln">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Luftunterstützung bei <strong className="text-foreground">eskalierenden Einsatzlagen</strong>, z. B. Geiselnahmen, Raubüberfällen, Razzien oder Drogentransporten</li>
            </ul>
          </SubSection>

          <SubSection title="2.7 Transport & Absetzen von Einheiten">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● <strong className="text-foreground">Combat-Landing</strong> zur schnellen Aufnahme oder Absetzung von Kräften</li>
              <li>● Einsatz der <strong className="text-foreground">Seilwinden</strong> bei Landungsunfähigkeit</li>
            </ul>
          </SubSection>
        </div>
      </Section>

      {/* 3. Technische Systeme */}
      <Section step={3} title="Technische Systeme" icon={<Eye className="w-5 h-5" />}>
        <div className="space-y-5">
          <SubSection title="3.1 Kamerasystem">
            <p className="text-sm font-medium text-foreground mb-2">Funktionen:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Zwei Betriebsmodi: <strong className="text-foreground">Normalmodus & Nachtsichtmodus</strong></li>
              <li>● <strong className="text-foreground">Zoom- und Fokussierfunktion</strong></li>
              <li>● <strong className="text-foreground">360°-Sichtfeld</strong></li>
            </ul>
            <p className="text-sm font-medium text-foreground mt-3 mb-2">Zweck:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Erkennung und Identifikation von Kennzeichen</li>
              <li>● Erfassung entfernter Objekte (vergleichbar mit Fernglasoptik)</li>
            </ul>
            <p className="text-sm font-medium text-foreground mt-3 mb-2">Bedienung:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● <span className="text-green-500 font-mono">E</span> → Kamera aktivieren</li>
              <li>● <span className="text-green-500 font-mono">Leertaste</span> → Fahrzeug im Zentrum fixieren</li>
              <li>● <span className="text-green-500 font-mono">Linksklick / Rechtsklick</span> → Moduswechsel</li>
            </ul>
          </SubSection>

          <SubSection title="3.2 Seilwinde (JCON-System)">
            <p className="text-sm font-medium text-foreground mb-2">Aufbau:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● Zwei Seilwinden, jeweils rechts und links montiert</li>
            </ul>
            <p className="text-sm font-medium text-foreground mt-3 mb-2">Zweck:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● <strong className="text-foreground">Abseilen von Einheiten</strong> an Orten ohne Landemöglichkeit</li>
              <li>● <strong className="text-foreground">Schneller taktischer Abwurf oder Evakuierung</strong></li>
            </ul>
            <p className="text-sm font-medium text-foreground mt-3 mb-2">Bedienung:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>● <span className="text-green-500 font-mono">X</span> → Seilwinde aktivieren</li>
              <li>● Abseilen erfolgt mit <strong className="text-foreground">moderater Geschwindigkeit</strong></li>
              <li>● <strong className="text-foreground">Wichtig für Piloten:</strong> Helikopter leicht <strong className="text-foreground">entgegengesetzt neigen</strong>, um Schieflage und Höhenverlust zu vermeiden</li>
            </ul>
          </SubSection>
        </div>
      </Section>

      {/* 4. Aufgabenverteilung in der Besatzung */}
      <Section step={4} title="Aufgabenverteilung in der Besatzung" icon={<Users className="w-5 h-5" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">Position</th>
                <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">Aufgaben</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-4 py-2 font-medium text-foreground">Pilot</td>
                <td className="border border-border px-4 py-2 text-muted-foreground">Flugbetrieb, teilweise Funkverkehr</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2 font-medium text-foreground">Co-Pilot</td>
                <td className="border border-border px-4 py-2 text-muted-foreground">Funkverkehr, Funkbrücke, Bergung von Verletzten, Waffeneinsatz, Navigation</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2 font-medium text-foreground">Bordschütze</td>
                <td className="border border-border px-4 py-2 text-muted-foreground">Waffeneinsatz, Funkunterstützung (falls Pilot/Co-Pilot ausgelastet), Bergung von Verletzten</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* 5. Funkcodes */}
      <Section step={5} title="Funkcodes (relevant für Overwatch)" icon={<Radio className="w-5 h-5" />}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>● <strong className="text-foreground">10-61:</strong> Starterlaubnis</li>
          <li>● <strong className="text-foreground">10-62:</strong> Landeerlaubnis</li>
        </ul>
        <Separator className="my-4" />
        <p className="text-sm font-medium text-foreground mb-2">Hinweise zum Funkverkehr:</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>● Beim <strong className="text-foreground">Landen im Staatsgefängnis</strong> ist auf die markierten Zonen zu achten.</li>
          <li>● Bei <strong className="text-foreground">anderen Behörden</strong> ist <strong className="text-foreground">immer vorher</strong> eine 10-62 (Landeerlaubnis) anzufragen.</li>
          <li>● <strong className="text-foreground">Zuwiderhandlungen</strong> können zu <strong className="text-foreground">Sanktionen oder Beschuss</strong> führen.</li>
        </ul>
      </Section>

      {/* 6. Landezonen Karte */}
      <Section step={6} title="Landezonen Karte" icon={<Map className="w-5 h-5" />}>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted/30">
                  <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">Symbol</th>
                  <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">Bedeutung</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-4 py-2"><span className="inline-block w-4 h-4 rounded-full bg-green-500"></span></td>
                  <td className="border border-border px-4 py-2 text-green-500 font-semibold">Keine Anfrage erforderlich</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><span className="inline-block w-4 h-4 rounded-full bg-yellow-500"></span></td>
                  <td className="border border-border px-4 py-2 text-yellow-500 font-semibold">Landeerlaubnis (10-62) erforderlich</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><span className="inline-block w-4 h-4 rounded-full bg-red-500"></span></td>
                  <td className="border border-border px-4 py-2">
                    <span className="text-red-500 font-semibold">Landung verboten!</span><br />
                    <span className="text-red-400 text-xs">Nur im Einsatzfall und mit ausdrücklicher Landeerlaubnis zulässig.</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <img src={landezonenImg} alt="Landezonen Karte" className="w-full rounded-lg border border-border" />
        </div>
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

export default TheorieausbildungContent;
