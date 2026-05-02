import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePlus, Trash2, ImageIcon, Loader2, X } from "lucide-react";

interface Props {
  examType: "ASD1" | "ASD2";
}

type ExamImage = {
  id: string;
  exam_type: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
};

const CAN_EDIT_ROLES = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"];

const PracticalExamImages = ({ examType }: Props) => {
  const { role, user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<ExamImage | null>(null);

  const canEdit = CAN_EDIT_ROLES.includes(role || "");

  const { data: images, isLoading } = useQuery({
    queryKey: ["practical-exam-images", examType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practical_exam_images" as any)
        .select("*")
        .eq("exam_type", examType)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ExamImage[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      if (!user) throw new Error("Nicht eingeloggt");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `practical-exam/${examType}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("assets").getPublicUrl(path);
      const { error: insErr } = await supabase.from("practical_exam_images" as any).insert({
        exam_type: examType,
        image_url: pub.publicUrl,
        caption: caption.trim() || null,
        uploaded_by: user.id,
        uploaded_by_name: profile?.name || null,
        sort_order: (images?.length || 0),
      } as any);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practical-exam-images", examType] });
      toast.success("Bild hochgeladen");
      setPendingFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: any) => toast.error("Fehler beim Hochladen: " + (e?.message || "")),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (img: ExamImage) => {
      const { error } = await supabase.from("practical_exam_images" as any).delete().eq("id", img.id);
      if (error) throw error;
      // best-effort storage cleanup
      try {
        const marker = "/object/public/assets/";
        const idx = img.image_url.indexOf(marker);
        if (idx >= 0) {
          const path = img.image_url.slice(idx + marker.length);
          await supabase.storage.from("assets").remove([path]);
        }
      } catch {/* ignore */}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practical-exam-images", examType] });
      toast.success("Bild gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Nur Bilddateien erlaubt");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Maximal 10 MB");
      return;
    }
    setPendingFile(f);
  };

  const submitUpload = () => {
    if (!pendingFile) return;
    setUploading(true);
    uploadMutation.mutate({ file: pendingFile, caption });
  };

  return (
    <div className="border border-border rounded-xl bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Referenzbilder {examType === "ASD1" ? "ASD 1" : "ASD 2"}</h3>
          <span className="text-xs text-muted-foreground">({images?.length || 0})</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <ImagePlus className="w-4 h-4" /> Bild hinzufügen
            </Button>
          </div>
        )}
      </div>

      {pendingFile && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={URL.createObjectURL(pendingFile)}
              alt="Vorschau"
              className="w-24 h-24 object-cover rounded-md border border-border"
            />
            <div className="flex-1 space-y-2">
              <p className="text-xs text-muted-foreground truncate">{pendingFile.name}</p>
              <Input
                placeholder="Bildunterschrift (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="h-9 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={submitUpload} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  Hochladen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setPendingFile(null); setCaption(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  disabled={uploading}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center animate-pulse">Bilder werden geladen…</p>
      ) : images && images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setLightbox(img)}
                className="block w-full aspect-video bg-muted/30"
              >
                <img
                  src={img.image_url}
                  alt={img.caption || `Referenzbild ${examType}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              {img.caption && (
                <p className="px-2 py-1.5 text-xs text-foreground/90 truncate bg-card">{img.caption}</p>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => { if (confirm("Bild wirklich löschen?")) deleteMutation.mutate(img); }}
                  className="absolute top-1.5 right-1.5 p-2 rounded-md bg-background/80 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                  aria-label="Bild löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          {canEdit ? "Noch keine Bilder. Lade Karten oder Routen für die Ausbilder hoch." : "Noch keine Referenzbilder vorhanden."}
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">
              {lightbox?.caption || `Referenzbild ${examType === "ASD1" ? "ASD 1" : "ASD 2"}`}
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            <div className="p-4 pt-2">
              <img
                src={lightbox.image_url}
                alt={lightbox.caption || "Referenzbild"}
                className="w-full h-auto max-h-[75vh] object-contain rounded-md"
              />
              {lightbox.uploaded_by_name && (
                <p className="text-xs text-muted-foreground mt-2">
                  Hochgeladen von {lightbox.uploaded_by_name}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticalExamImages;