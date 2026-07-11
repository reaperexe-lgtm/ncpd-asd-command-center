import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SlideshowImagesSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hintergrund-Slideshow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Die Hintergrundbilder werden jetzt lokal aus dem Ordner <strong>public/images</strong> geladen.
        </p>
        <p>
          Lege neue Bilder dort ab, und sie erscheinen automatisch in der Slideshow. Für die Reihenfolge reicht die Dateibenennung,
          da die Dateien alphabetisch sortiert werden.
        </p>
        <div className="rounded-lg border border-dashed border-border p-3 bg-muted/30">
          Beispiel: <span className="font-medium text-foreground">public/images/mein-bild.png</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlideshowImagesSection;