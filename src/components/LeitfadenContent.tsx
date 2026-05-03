import leitfadenCover from "@/assets/leitfaden-cover.png";
import leitfadenBurgershot from "@/assets/leitfaden-burgershot.png";
import leitfadenFallschirm from "@/assets/leitfaden-fallschirm.png";
import leitfadenCombatlanding from "@/assets/leitfaden-combatlanding.png";
import leitfadenHang from "@/assets/leitfaden-hang.png";
import leitfadenPruefungsstrecke from "@/assets/leitfaden-pruefungsstrecke.png";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, MapPin, Crosshair, Navigation, Clock, Plane
} from "lucide-react";

const LeitfadenContent = ({
  onNavigateToExam,
  hideVorabpruefung = false,
  onNavigateToTheorieausbildung,
  onNavigateToTheoriepruefung,
}: {
  onNavigateToExam?: (examType: "ASD1" | "ASD2") => void;
  hideVorabpruefung?: boolean;
  onNavigateToTheorieausbildung?: () => void;
  onNavigateToTheoriepruefung?: () => void;
}) => {
  return (
    <div className="space-y-8">
      {/* Cover */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="flex flex-col items-center py-8 px-6 text-center">
          <img src={leitfadenCover} alt="ASD Logo" className="w-48 h-48 object-contain rounded-full mb-6" />
          <h2 className="text-2xl font-bold text-green-600">Air Support Division</h2>
          <p className="text-sm font-semibold text-foreground mt-1">Narco City Police Department</p>
          <Separator className="my-4 w-2/3" />
          <p className="text-xl font-bold text-foreground">→ Ausbildungsleitfaden ←</p>
          <Separator className="my-4 w-2/3" />
          <p className="text-xs text-muted-foreground">Robert White - Pablo Morales | Director of Air Support Division</p>
        </div>
      </div>

      {/* Schritt 1 */}
      {!hideVorabpruefung && (
        <Section
          step={1}
          title="Vorabprüfung"
          icon={<Crosshair className="w-5 h-5" />}
        >
          <p className="text-sm text-muted-foreground">
            Wähle eine der beiden Prüfungsstrecken:
          </p>
          <div className="flex gap-3 mt-2">
            <Badge
              variant="outline"
              className="text-sm px-3 py-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onNavigateToExam?.("ASD1")}
            >
              Bewerbungsprüfung ASD 1
            </Badge>
            <Badge
              variant="outline"
              className="text-sm px-3 py-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onNavigateToExam?.("ASD2")}
            >
              Bewerbungsprüfung ASD 2
            </Badge>
          </div>
        </Section>
      )}

      {/* Schritt 2 */}
      <Section
        step={2}
        title="Theorieausbildung"
        icon={<BookOpen className="w-5 h-5" />}
      >
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li
            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onNavigateToTheorieausbildung?.()}
          >
            <span className="text-primary">➤</span> NCPD ASD | Theorieausbildung
          </li>
          <li
            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onNavigateToTheoriepruefung?.()}
          >
            <span className="text-primary">➤</span> NCPD ASD | Theorieprüfung
          </li>
        </ul>
      </Section>

      {/* Schritt 3 */}
      <Section
        step={3}
        title="Präzisionslandungen"
        icon={<MapPin className="w-5 h-5" />}
      >
        <p className="text-sm text-muted-foreground mb-4">
          Die Präzisionslandungen, bis auf den Fallschirmsprung, müssen jeweils <strong className="text-foreground">dreimal</strong> korrekt ausgeführt werden.
        </p>

        <SubSection title="Uhrenturm am Burgershot (PLZ 8009)">
          <p className="text-sm text-muted-foreground">
            Hier gilt es zu beachten, dass der Helikopter am Ende gerade steht und nicht zu einer Seite geneigt ist.
          </p>
          <img src={leitfadenBurgershot} alt="Burgershot Uhrenturm" className="w-full rounded-lg border border-border mt-3" />
        </SubSection>

        <SubSection title="Fallschirmsprung (nur für A.S.D. Bewerber)">
          <p className="text-sm text-muted-foreground">
            Der Helikopter befindet sich auf Höhe des 3. Strichs über Burgershot.<br />
            <strong className="text-foreground">Ziel:</strong> Landung auf dem Helipad der Yacht.
          </p>
          <img src={leitfadenFallschirm} alt="Fallschirmsprung" className="w-full rounded-lg border border-border mt-3" />
        </SubSection>

        <SubSection title="Combatlanding (PLZ 10012)">
          <p className="text-sm text-muted-foreground">
            Beim Combatlanding muss eine Geschwindigkeit von mindestens <strong className="text-foreground">200–220 km/h</strong> vor der Drehung erreicht werden.
            Die Drehung wird eingeleitet, wenn man sich über der letzten Querstraße befindet.<br />
            <strong className="text-foreground">Ziel:</strong> Der betonierte Kreis, der im Bild zu sehen ist.
          </p>
          <img src={leitfadenCombatlanding} alt="Combatlanding" className="w-full rounded-lg border border-border mt-3" />
        </SubSection>

        <SubSection title="Landen am Hang (PLZ 7352)">
          <p className="text-sm text-muted-foreground">
            Nach dem Aufsetzen auf dem Boden darf der Helikopter nicht weiter als <strong className="text-foreground">2 m</strong> nach unten rutschen, sonst ist die Landung ungültig.
          </p>
          <img src={leitfadenHang} alt="Landen am Hang" className="w-full rounded-lg border border-border mt-3" />
        </SubSection>
      </Section>

      {/* Schritt 4 */}
      <Section
        step={4}
        title="Helikopter Verfolgung"
        icon={<Navigation className="w-5 h-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Bei dieser etwa fünfminütigen Trainingsübung fliegt der Ausbilder voraus, während der Auszubildende versucht, ihm präzise zu folgen. Ziel ist es, Flugkontrolle, Abstandshaltung und Reaktionsfähigkeit zu trainieren.
          </p>
          <p>
            Während der Verfolgung führt der Ausbilder verschiedene Manöver aus: <strong className="text-foreground">dreimal unter Brücken hindurch</strong>, <strong className="text-foreground">dreimal zwischen Hochhäusern</strong> sowie einen <strong className="text-foreground">kontrollierten Sturzflug</strong> aus maximal drei Strich Höhe.
          </p>
          <p>
            Der Auszubildende folgt allen Bewegungen mit sicherem Abstand, achtet auf stabile Fluglage. Nach rund fünf Minuten wird die Übung beendet.
          </p>
          <p>
            Der Ausbilder hat hierbei darauf zu achten, wie der Auszubildende sich in der Luft verhält. Dieser sollte möglichst ohne Fremdkörper Kontakt mit dem Helikopter durch Brücken oder andere Hindernisse manövrieren.
          </p>
        </div>
      </Section>

      {/* Schritt 5 */}
      <Section
        step={5}
        title="Prüfungsstrecke"
        icon={<Plane className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-border rounded-lg p-4 bg-background">
              <h4 className="font-semibold text-foreground text-sm mb-2">Für A.S.D. Bewerber:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>● Zeitlimit: <strong className="text-foreground">07:50 min</strong></li>
                <li>● 2x vorwärts, 2x rückwärts in der Höhle</li>
              </ul>
            </div>
            <div className="border border-border rounded-lg p-4 bg-background">
              <h4 className="font-semibold text-foreground text-sm mb-2">Für den Flugschein:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>● Zeitlimit: <strong className="text-foreground">07:35 min</strong></li>
                <li>● 2x vorwärts in der Höhle</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Die Zeit startet ab der ersten Brücke, durch die geflogen wird.
            Beim Rückwärtsflug wird 10 Sekunden rückwärts geflogen, der Ausbilder zählt diese im Funk herunter.
          </p>
          <img src={leitfadenPruefungsstrecke} alt="Prüfungsstrecke Karte" className="w-full rounded-lg border border-border" />
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
        <p className="text-xs text-muted-foreground">Schritt {step}</p>
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

export default LeitfadenContent;
