import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, Move } from "lucide-react";
import { toast } from "sonner";

interface ImageCropDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (blob: Blob) => void;
  /** Breite/Höhe-Verhältnis des Ausschnitts, Standard 16:9 (passt zur Kartenansicht) */
  aspect?: number;
  /** Breite des Ausgabebildes in Pixel (Höhe ergibt sich aus aspect) */
  outputWidth?: number;
}

// Anzeige-Canvas bewusst klein halten -> flüssiges Ziehen/Zoomen unabhängig vom Originalbild.
const DISPLAY_WIDTH = 480;

/**
 * Zuschneide-Dialog: Nutzer kann ein Bild zoomen & verschieben, bevor es hochgeladen wird.
 * Das Ergebnis wird EINMALIG serverseitig als fertig zugeschnittenes, größenreduziertes
 * Bild gespeichert (kein Live-Cropping beim Anzeigen) -> beliebig viele Familien-Bilder
 * bleiben beim Rendern ein simples <img>, ohne Performance-Kosten.
 */
export function ImageCropDialog({ file, open, onOpenChange, onConfirm, aspect = 16 / 9, outputWidth = 960 }: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);

  const displayHeight = Math.round(DISPLAY_WIDTH / aspect);

  // Bild laden, sobald eine neue Datei übergeben wird
  useEffect(() => {
    if (!file || !open) return;
    setReady(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  const getBaseScale = useCallback(() => {
    const img = imgRef.current;
    if (!img) return 1;
    return Math.max(DISPLAY_WIDTH / img.width, displayHeight / img.height);
  }, [displayHeight]);

  const clampOffset = useCallback((x: number, y: number, effScale: number) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const maxX = Math.max(0, (img.width * effScale - DISPLAY_WIDTH) / 2);
    const maxY = Math.max(0, (img.height * effScale - displayHeight) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, [displayHeight]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const effScale = getBaseScale() * zoom;
    ctx.clearRect(0, 0, DISPLAY_WIDTH, displayHeight);
    ctx.save();
    ctx.translate(DISPLAY_WIDTH / 2 + offset.x, displayHeight / 2 + offset.y);
    ctx.scale(effScale, effScale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }, [zoom, offset, getBaseScale, displayHeight]);

  useEffect(() => { if (ready) draw(); }, [ready, draw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const effScale = getBaseScale() * zoom;
    setOffset(clampOffset(dragRef.current.offX + dx, dragRef.current.offY + dy, effScale));
  };
  const handlePointerUp = () => { dragRef.current = null; };

  const handleZoomChange = (v: number[]) => {
    const z = v[0];
    setZoom(z);
    const effScale = getBaseScale() * z;
    setOffset((prev) => clampOffset(prev.x, prev.y, effScale));
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const outH = Math.round(outputWidth / aspect);
    const out = document.createElement("canvas");
    out.width = outputWidth;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const factor = outputWidth / DISPLAY_WIDTH;
    const effScale = getBaseScale() * zoom * factor;
    ctx.save();
    ctx.translate(outputWidth / 2 + offset.x * factor, outH / 2 + offset.y * factor);
    ctx.scale(effScale, effScale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Manche (v.a. ältere/eingebettete) Browser unterstützen kein WebP-Encoding via canvas.
    // In dem Fall liefert toBlob() null zurück – dann auf JPEG zurückfallen.
    out.toBlob((blob) => {
      if (blob) { onConfirm(blob); return; }
      out.toBlob((jpegBlob) => {
        if (jpegBlob) onConfirm(jpegBlob);
        else {
          console.error("ImageCropDialog: canvas.toBlob() lieferte weder WebP noch JPEG");
          toast.error("Bild konnte nicht verarbeitet werden. Bitte anderes Bild/Browser versuchen.");
        }
      }, "image/jpeg", 0.85);
    }, "image/webp", 0.85);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><Move className="w-4 h-4" /> Bildausschnitt wählen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={DISPLAY_WIDTH}
            height={displayHeight}
            className="rounded-md border border-border cursor-grab active:cursor-grabbing bg-black/20 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <div className="flex items-center gap-3 w-full max-w-[480px]">
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={handleZoomChange} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Zum Verschieben ziehen, mit dem Regler zoomen.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleConfirm} disabled={!ready}>Übernehmen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
