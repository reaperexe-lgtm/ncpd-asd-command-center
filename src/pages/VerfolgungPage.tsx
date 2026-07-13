import { useEffect, useState } from "react";
import { usePersistedState, clearPersistedKeys } from "@/hooks/usePersistedState";
import { logActivity } from "@/lib/activityLog";
import { nowRoundedForInput, convertLocalToUTC } from "@/lib/dateUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import { Plus, Trash2, Car, Siren, Users, Image, Clock, X } from "lucide-react";

const VerfolgungPage = () => {
  const { user, isAdmin, role } = useAuth();
  const canDelete = isAdmin || role === "supervisor";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = usePersistedState<boolean>("verfolgung_showForm", false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Form state
  const [vehicleModel, setVehicleModel] = usePersistedState<string>("verfolgung_vehicleModel", "");
  const [licensePlate, setLicensePlate] = usePersistedState<string>("verfolgung_licensePlate", "");
  const [pursuitDate, setPursuitDate] = usePersistedState<string>("verfolgung_pursuitDate", "");

  useEffect(() => {
    if (!pursuitDate) setPursuitDate(nowRoundedForInput());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pilot, setPilot] = usePersistedState<string>("verfolgung_pilot", "");
  const [coPilot, setCoPilot] = usePersistedState<string>("verfolgung_coPilot", "");
  const [leftGunner, setLeftGunner] = usePersistedState<string>("verfolgung_leftGunner", "");
  const [rightGunner, setRightGunner] = usePersistedState<string>("verfolgung_rightGunner", "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const { data: pursuits, isLoading } = useQuery({
    queryKey: ["pursuits"],
    queryFn: async () => {
      const { data } = await supabase.from("pursuits").select("*, pursuit_photos(*)").order("pursuit_date", { ascending: false });
      return data || [];
    },
    pollInterval: 60000,
  });

  const { data: members } = useQuery({
    queryKey: ["members-select"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, dienstnummer, internal_dienstnummer").eq("is_approved", true);
      return data || [];
    },
  });

  const savePursuit = useMutation({
    mutationFn: async () => {
      const { data: pursuit, error } = await supabase.from("pursuits").insert({
        created_by: user!.id,
        pursuer: "–",
        vehicle_model: vehicleModel || null,
        license_plate: licensePlate || null,
        pursuit_date: pursuitDate ? convertLocalToUTC(pursuitDate) : new Date().toISOString(),
        pilot: pilot?.trim() || null,
        co_pilot: coPilot?.trim() || null,
        left_gunner: leftGunner?.trim() || null,
        right_gunner: rightGunner?.trim() || null,
      }).select().single();
      if (error) throw error;

      if (photos.length > 0) {
        for (const photo of photos) {
          const ext = photo.name.split(".").pop();
          const path = `${pursuit.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("pursuit-photos").upload(path, photo);
          if (upErr) continue;
          const { data: urlData } = supabase.storage.from("pursuit-photos").getPublicUrl(path);
          await supabase.from("pursuit_photos").insert({ pursuit_id: pursuit.id, image_url: urlData.publicUrl });
        }
      }
      return pursuit;
    },
    onSuccess: () => {
      toast.success("Verfolgung gespeichert!");
      queryClient.invalidateQueries({ queryKey: ["pursuits"] });
      logActivity("Verfolgung erstellt", "verfolgung", { vehicle: vehicleModel, plate: licensePlate });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePursuit = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("pursuit_photos").delete().eq("pursuit_id", id);
      const { error } = await supabase.from("pursuits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["pursuits"] });
      toast.success("Verfolgung gelöscht");
      logActivity("Verfolgung gelöscht", "verfolgung", { pursuit_id: id });
      logActivity("Verfolgung gelöscht", "verfolgung", { pursuit_id: id });
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: { id: string; image_url: string }) => {
      // Extract storage path from URL
      const urlParts = photo.image_url.split("/pursuit-photos/");
      if (urlParts[1]) {
        await supabase.storage.from("pursuit-photos").remove([decodeURIComponent(urlParts[1])]);
      }
      const { error } = await supabase.from("pursuit_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pursuits"] });
      toast.success("Foto gelöscht");
    },
  });

  const addPhotosToExisting = useMutation({
    mutationFn: async ({ pursuitId, files }: { pursuitId: string; files: File[] }) => {
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${pursuitId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pursuit-photos").upload(path, file);
        if (upErr) continue;
        const { data: urlData } = supabase.storage.from("pursuit-photos").getPublicUrl(path);
        await supabase.from("pursuit_photos").insert({ pursuit_id: pursuitId, image_url: urlData.publicUrl });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pursuits"] });
      toast.success("Foto(s) hinzugefügt");
    },
  });

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setPhotos((prev) => [...prev, ...arr]);
    setPhotoPreviewUrls((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  };

  // Paste images from clipboard (works while form is open OR on existing pursuit when expanded)
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items).filter((it) => it.type.startsWith("image/"));
      if (items.length === 0) return;
      const files = items
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f)
        .map((f) => new File([f], `paste_${Date.now()}.${f.type.split("/")[1] || "png"}`, { type: f.type }));
      if (files.length === 0) return;
      e.preventDefault();
      if (showForm) {
        setPhotos((prev) => [...prev, ...files]);
        setPhotoPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        toast.success(`${files.length} Bild(er) eingefügt`);
      } else if (expandedId) {
        addPhotosToExisting.mutate({ pursuitId: expandedId, files });
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [showForm, expandedId]);

  const removePreviewPhoto = (idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
    setPhotoPreviewUrls((p) => p.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setVehicleModel(""); setLicensePlate("");
    setPursuitDate(nowRoundedForInput()); setPilot(""); setCoPilot("");
    setLeftGunner(""); setRightGunner(""); setPhotos([]); setPhotoPreviewUrls([]); setShowForm(false);
    clearPersistedKeys([
      "verfolgung_vehicleModel","verfolgung_licensePlate",
      "verfolgung_pursuitDate","verfolgung_pilot","verfolgung_coPilot",
      "verfolgung_leftGunner","verfolgung_rightGunner",
    ]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={lightboxUrl} alt="Foto" className="max-w-full max-h-[90vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Siren className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">10-80 Verfolgung</h1>
            <p className="text-xs text-muted-foreground">{pursuits?.length || 0} Verfolgungsjagden</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Abbrechen" : "Neue Verfolgung"}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-5 bg-card border border-border rounded-lg p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Fahrzeug</Label>
              <Input className="mt-1 bg-background border-border" placeholder="Modell" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
            </div>
            <div>
              <Label>Kennzeichen</Label>
              <Input className="mt-1 bg-background border-border" placeholder="z.B. AB 123 CD" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div>
              <Label>Datum & Uhrzeit</Label>
              <Input type="datetime-local" step={300} className="mt-1 bg-background border-border" value={pursuitDate} onChange={(e) => setPursuitDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><Image className="w-4 h-4" /> Fotos (z.B. Kennzeichen) <span className="text-[10px] text-muted-foreground font-normal">– Strg+V zum Einfügen aus Zwischenablage</span></Label>
            <Input type="file" multiple accept="image/*" className="mt-1 bg-background border-border" onChange={(e) => handlePhotoSelect(e.target.files)} />
            {photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {photoPreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt="Vorschau" className="rounded-md border border-border object-cover w-full h-24" />
                    <button
                      onClick={() => removePreviewPhoto(idx)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-primary">Besatzung</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Pilot", value: pilot, set: setPilot, listId: "pursuit-pilot-list" },
                { label: "Co-Pilot", value: coPilot, set: setCoPilot, listId: "pursuit-copilot-list" },
                { label: "Left Gunner", value: leftGunner, set: setLeftGunner, listId: "pursuit-lg-list" },
                { label: "Right Gunner", value: rightGunner, set: setRightGunner, listId: "pursuit-rg-list" },
              ].map(({ label, value, set, listId }) => (
                <div key={label}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1 bg-background border-border"
                    placeholder={`${label} wählen...`}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    list={listId}
                  />
                  <datalist id={listId}>
                    {members?.map((m) => (
                      <option key={m.id} value={m.name}>{m.name} {(m as any).internal_dienstnummer ? `[${(m as any).internal_dienstnummer}]` : ""} {m.dienstnummer ? `(${m.dienstnummer})` : ""}</option>
                    ))}
                  </datalist>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => savePursuit.mutate()} disabled={savePursuit.isPending}>
              {savePursuit.isPending ? "Speichern..." : "Verfolgung speichern"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade Verfolgungen...</div></div>
      ) : pursuits?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Siren className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Keine Verfolgungsjagden vorhanden</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pursuits?.map((p: any) => {
            const expanded = expandedId === p.id;
            const pPhotos = (p.pursuit_photos as any[]) || [];
            return (
              <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/20 transition-colors">
                <button onClick={() => setExpandedId(expanded ? null : p.id)} className="w-full px-5 py-4 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs px-3 py-1 rounded-full border font-medium bg-primary/10 text-primary border-primary/20">10-80</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(p.pursuit_date).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · {new Date(p.pursuit_date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
                    </span>
                    {p.vehicle_model && <span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" /> {p.vehicle_model}</span>}
                    {p.license_plate && <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{p.license_plate}</span>}
                    {pPhotos.length > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Image className="w-3 h-3" /> {pPhotos.length}</span>}
                  </div>
                  <svg className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {p.description && <p className="text-sm leading-relaxed">{p.description}</p>}

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Fahrzeug", value: p.vehicle_model },
                        { label: "Kennzeichen", value: p.license_plate },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                          <p className="text-sm text-primary mt-0.5">{value || "–"}</p>
                        </div>
                      ))}
                    </div>

                    {/* Photos section */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Image className="w-3 h-3" /> Fotos ({pPhotos.length})</p>
                      {pPhotos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                          {pPhotos.map((ph: any) => (
                            <div key={ph.id} className="relative group">
                              <img
                                src={ph.image_url}
                                alt="Verfolgungsfoto"
                                className="rounded-md border border-border object-cover w-full h-32 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxUrl(ph.image_url)}
                              />
                              {isAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deletePhoto.mutate({ id: ph.id, image_url: ph.image_url }); }}
                                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-12 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add more photos */}
                      <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Foto hinzufügen
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              addPhotosToExisting.mutate({ pursuitId: p.id, files: Array.from(e.target.files) });
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Besatzung</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { label: "Pilot", value: p.pilot },
                          { label: "Co-Pilot", value: p.co_pilot },
                          { label: "Left Gunner", value: p.left_gunner },
                          { label: "Right Gunner", value: p.right_gunner },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-24">{label}:</span>
                            <span className={value && value !== "none" ? "text-primary" : "text-muted-foreground"}>{value && value !== "none" ? value : "–"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {canDelete && (
                      <div className="flex justify-end pt-2">
                        <Button size="sm" variant="destructive" onClick={() => deletePursuit.mutate(p.id)} className="gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" /> Löschen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VerfolgungPage;
