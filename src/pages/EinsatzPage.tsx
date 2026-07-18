import { useState, useEffect } from "react";
import { usePersistedState, clearPersistedKeys } from "@/hooks/usePersistedState";
import { logActivity } from "@/lib/activityLog";
import { createEmptyVehicleForm, normalizeVehicleForm, type VehicleFormData } from "@/lib/vehicleForm";
import { nowRoundedForInput, convertLocalToUTC } from "@/lib/dateUtils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Car, FileText, Users, Shield, Pencil } from "lucide-react";
import { GANG_CATEGORIES } from "@/lib/gangCategories";
import { awardAchievements } from "@/lib/achievements";
import { checkAndClaimWeeklyChallenges } from "@/lib/weeklyChallenges";

const LOCATIONS = ["Staatsbank","Juwelier","Human Labs","Geiselnahme","10-12 Laden","1000 Laden","Paleto Bank","Sandy Laden","Razzia","Panikbutton","Sonstiges"];
const VEHICLE_TYPES = ["Fahrzeug","Motorrad","Helikopter","Boot"];
const VEHICLE_MODELS = ["Drafter","VSTR","Sultan Classic","Sultan Revolter","Schafter","Jugular","Chino Custom","Faction Custom","Benefactor","Schlagen","Schneider","BFB 100","Super Volito","Skyhawk","Null","Sonstiges"];

function getMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

type VehicleForm = VehicleFormData;

const emptyVehicle: VehicleForm = createEmptyVehicleForm();

const EinsatzPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = usePersistedState<string>("einsatz_location", "");
  const [customLocation, setCustomLocation] = usePersistedState<string>("einsatz_customLocation", "");
  const [tatzeit, setTatzeit] = usePersistedState<string>("einsatz_tatzeit", "");

  useEffect(() => {
    if (!tatzeit) setTatzeit(nowRoundedForInput());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [suspects, setSuspects] = usePersistedState<string>("einsatz_suspects", "1");
  const [hostages, setHostages] = usePersistedState<string>("einsatz_hostages", "0");
  const [gangId, setGangId] = usePersistedState<string>("einsatz_gangId", "");
  const [gangInfo, setGangInfo] = usePersistedState<string>("einsatz_gangInfo", "");
  
  const [pilot, setPilot] = usePersistedState<string>("einsatz_pilot", "");
  const [coPilot, setCoPilot] = usePersistedState<string>("einsatz_coPilot", "");
  const [leftGunner, setLeftGunner] = usePersistedState<string>("einsatz_leftGunner", "");
  const [rightGunner, setRightGunner] = usePersistedState<string>("einsatz_rightGunner", "");
  const [vehicles, setVehicles] = usePersistedState<VehicleForm[]>("einsatz_vehicles", []);
  const [showVehicleForm, setShowVehicleForm] = usePersistedState<boolean>("einsatz_showVehicleForm", false);
  const [currentVehicle, setCurrentVehicle] = usePersistedState<VehicleForm>("einsatz_currentVehicle", { ...emptyVehicle });
  const [editingIndex, setEditingIndex] = usePersistedState<number | null>("einsatz_editingIndex", null);

  const { data: gangs } = useQuery({
    queryKey: ["gangs"],
    queryFn: async () => { const { data } = await supabase.from("gangs").select("*"); return data || []; },
  });

  // Fahrzeugmodelle des Dropdowns nach Häufigkeit im aktuellen Monat sortieren
  // (gleiche Basis wie "Fahrzeuge (Monat)" in der Statistik: mission_vehicles der
  // Einsätze des aktuellen Monats, inkl. manuellem Monats-Reset der Übersicht-Statistik)
  const { data: monthMissionsForVehicleSort } = useQuery({
    queryKey: ["einsatz-missions-for-vehicle-sort"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("id, tatzeit, created_at");
      return data || [];
    },
  });

  const { data: allMissionVehiclesForSort } = useQuery({
    queryKey: ["einsatz-mission-vehicles-for-sort"],
    queryFn: async () => {
      const { data } = await supabase.from("mission_vehicles").select("mission_id, model");
      return data || [];
    },
  });

  const { data: overviewMonthlyResetForSort } = useQuery({
    queryKey: ["einsatz-overview-monthly-reset-for-sort"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stats_resets")
        .select("*")
        .eq("reset_type", "overview_monthly")
        .order("reset_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  const sortedVehicleModels = (() => {
    const { start: monthStart, end: monthEnd } = getMonthRange();
    const effectiveMonthStart = overviewMonthlyResetForSort?.reset_at && new Date(overviewMonthlyResetForSort.reset_at) > monthStart
      ? new Date(overviewMonthlyResetForSort.reset_at)
      : monthStart;
    const missionIds = new Set(
      (monthMissionsForVehicleSort || [])
        .filter((m: any) => {
          const d = new Date(m.tatzeit ?? m.created_at);
          return d >= effectiveMonthStart && d < monthEnd;
        })
        .map((m: any) => m.id)
    );
    const counts: Record<string, number> = {};
    (allMissionVehiclesForSort || []).forEach((v: any) => {
      if (!missionIds.has(v.mission_id)) return;
      const label = (v.model || "").trim();
      if (!label) return;
      counts[label] = (counts[label] || 0) + 1;
    });
    return [...VEHICLE_MODELS].sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  })();

  const { data: members } = useQuery({
    queryKey: ["members-select"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, dienstnummer, internal_dienstnummer").eq("is_approved", true);
      return data || [];
    },
  });

  const { data: ownProfile } = useQuery({
    queryKey: ["my-profile-for-rewards", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("name, dienstnummer").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const saveMission = useMutation({
    mutationFn: async () => {
      const { data: mission, error } = await supabase.from("missions").insert({
        location_type: location === "Sonstiges" ? customLocation : location,
        custom_location: location === "Sonstiges" ? customLocation : null,
        tatzeit: tatzeit ? convertLocalToUTC(tatzeit) : new Date().toISOString(),
        suspects_count: parseInt(suspects),
        hostages_count: parseInt(hostages),
        gang_id: gangId && gangId !== "none" ? gangId : null,
        gang_info: gangInfo || null,
        pilot: pilot && pilot !== "none" ? pilot : null,
        co_pilot: coPilot && coPilot !== "none" ? coPilot : null,
        left_gunner: leftGunner && leftGunner !== "none" ? leftGunner : null,
        right_gunner: rightGunner && rightGunner !== "none" ? rightGunner : null,
        created_by: user!.id,
        protokollschreiber: user!.id,
      }).select().single();
      if (error) throw error;

      if (vehicles.length > 0) {
        const { error: vError } = await supabase.from("mission_vehicles").insert(
          vehicles.map((v) => ({
            mission_id: mission.id,
            vehicle_type: v.vehicle_type,
            model: v.model === "Sonstiges" ? v.custom_model : v.model,
            custom_model: v.model === "Sonstiges" ? v.custom_model : null,
            license_plate: v.license_plate,
            owner_info: v.owner_info,
            primary_color: v.primary_color,
            pearl_color: v.pearl_color,
          }))
        );
        if (vError) throw vError;
      }
      return mission;
    },
    onSuccess: (mission) => {
      toast.success("Einsatz erfolgreich gespeichert!");
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      logActivity("Einsatz erstellt", "einsatz", { location: location === "Sonstiges" ? customLocation : location, suspects: parseInt(suspects), hostages: parseInt(hostages) });
      // 12.07.2026 Fix: löst Achievement-Vergabe & Wochenziel-Check direkt beim
      // Erstellen aus, statt darauf zu warten, dass zufällig die Achievements-Seite
      // besucht wird. Bewusst "fire and forget" (best effort) — soll die
      // Erfolgsmeldung/das Formular-Reset nicht blockieren oder verzögern.
      if (user) {
        awardAchievements(user.id, ownProfile?.name || "", ownProfile?.dienstnummer).catch((e) =>
          console.error("[EinsatzPage] awardAchievements fehlgeschlagen:", e),
        );
        checkAndClaimWeeklyChallenges(user.id, ownProfile?.name || "", ownProfile?.dienstnummer).catch((e) =>
          console.error("[EinsatzPage] checkAndClaimWeeklyChallenges fehlgeschlagen:", e),
        );
      }
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setLocation(""); setCustomLocation(""); setTatzeit(nowRoundedForInput());
    setSuspects("1"); setHostages("0"); setGangId(""); setGangInfo("");
    setPilot(""); setCoPilot(""); setLeftGunner(""); setRightGunner("");
    setVehicles([]); setShowVehicleForm(false);
    setCurrentVehicle({ ...emptyVehicle });
    clearPersistedKeys([
      "einsatz_location","einsatz_customLocation","einsatz_tatzeit",
      "einsatz_suspects","einsatz_hostages","einsatz_gangId","einsatz_gangInfo",
      "einsatz_protokollschreiber","einsatz_pilot","einsatz_coPilot",
      "einsatz_leftGunner","einsatz_rightGunner","einsatz_vehicles",
      "einsatz_showVehicleForm","einsatz_currentVehicle","einsatz_editingIndex",
    ]);
  };

  const addVehicle = () => {
    if (editingIndex !== null) {
      // Bestehendes Fahrzeug aktualisieren
      const updated = [...vehicles];
      updated[editingIndex] = { ...currentVehicle };
      setVehicles(updated);
      setEditingIndex(null);
      setCurrentVehicle({ ...emptyVehicle });
    } else {
      setVehicles([...vehicles, { ...currentVehicle }]);
      // Farben für nächstes Fahrzeug behalten
      setCurrentVehicle({
        ...emptyVehicle,
        primary_color: currentVehicle.primary_color,
        pearl_color: currentVehicle.pearl_color,
      });
    }
    setShowVehicleForm(false);
  };

  const startEditVehicle = (i: number) => {
    setCurrentVehicle(normalizeVehicleForm(vehicles[i]));
    setEditingIndex(i);
    setShowVehicleForm(true);
  };

  const handleGangSelect = (id: string) => {
    setGangId(id);
    if (id === "none") {
      setGangInfo("");
      return;
    }
    const gang = gangs?.find((g) => g.id === id);
    setGangInfo((gang as any)?.erkennungsmerkmale || "");
    const g = gang as any;
    if (g?.primary_color || g?.pearl_color) {
      setCurrentVehicle({
        ...currentVehicle,
        primary_color: g?.primary_color || currentVehicle.primary_color,
        pearl_color: g?.pearl_color || currentVehicle.pearl_color,
      });
    }
  };

  const gangsByCategory = GANG_CATEGORIES.map((cat) => ({
    ...cat,
    items: gangs?.filter((g) => g.category === cat.value) || [],
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Einsatz erstellen</h1>
          <p className="text-xs text-muted-foreground">Neues Einsatzprotokoll anlegen</p>
        </div>
      </div>


      {/* Raubinformationen */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Raubinformationen / Geiselnahme</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Was für ein Raub?</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Raubart wählen..." /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            {location === "Sonstiges" && (
              <Input className="mt-2 bg-background border-border" placeholder="Eigenen Ort eingeben..." value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} />
            )}
          </div>
          <div>
            <Label>Tatzeitraum</Label>
            <div className="flex gap-2">
              <Input type="datetime-local" step={300} value={tatzeit} onChange={(e) => setTatzeit(e.target.value)} className="mt-1 bg-background border-border flex-1" />
              <Button type="button" variant="outline" onClick={() => setTatzeit(nowRoundedForInput())} className="mt-1">Jetzt</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Anzahl Tatverdächtige</Label>
            <Select value={suspects} onValueChange={setSuspects}>
              <SelectTrigger className="mt-1 bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Anzahl der Geiseln</Label>
            <Select value={hostages} onValueChange={setHostages}>
              <SelectTrigger className="mt-1 bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 21 }, (_, i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Infos zur Bande (Familie)</Label>
            <Select value={gangId} onValueChange={handleGangSelect}>
              <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Familie wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine / Unbekannt</SelectItem>
                {gangsByCategory.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <SelectGroup key={cat.value}>
                      {idx > 0 && <SelectSeparator />}
                      <SelectLabel className="flex items-center gap-1.5 py-2 pl-2 text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 rounded-sm mx-1">
                        <Icon className="w-3.5 h-3.5" /> {cat.label}
                      </SelectLabel>
                      {cat.items.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Weitere Infos zur Bande</Label>
            <Input className="mt-1 bg-background border-border" placeholder="z.B. Farben, Merkmale..." value={gangInfo} onChange={(e) => setGangInfo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Fahrzeuge */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-primary">Fahrzeuge</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowVehicleForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Hinzufügen
          </Button>
        </div>

        {vehicles.map((v, i) => (
          <div key={i} className="flex items-center justify-between bg-background border border-border rounded-md px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-4 h-4 rounded-full border border-border" style={{ background: v.primary_color }} />
                <span className="w-4 h-4 rounded-full border border-border" style={{ background: v.pearl_color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">{v.vehicle_type} – {v.model === "Sonstiges" ? v.custom_model : v.model}</p>
                <p className="text-xs text-muted-foreground">{v.license_plate || "Kein Kennzeichen"} {v.owner_info ? `· ${v.owner_info}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEditVehicle(i)} className="text-primary hover:text-primary/80 transition-colors p-1" title="Bearbeiten">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setVehicles(vehicles.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80 transition-colors p-1" title="Löschen">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {vehicles.length === 0 && !showVehicleForm && (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Fahrzeuge hinzugefügt</p>
        )}

        {showVehicleForm && (
          <div className="space-y-4 border border-primary/20 rounded-lg p-4 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Art</Label>
                <Select value={currentVehicle.vehicle_type} onValueChange={(v) => setCurrentVehicle({ ...currentVehicle, vehicle_type: v })}>
                  <SelectTrigger className="mt-1 bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modell</Label>
                <Select value={currentVehicle.model} onValueChange={(v) => setCurrentVehicle({ ...currentVehicle, model: v })}>
                  <SelectTrigger className="mt-1 bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{sortedVehicleModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                {currentVehicle.model === "Sonstiges" && (
                  <Input className="mt-2 bg-card border-border" placeholder="Eigenes Modell" value={currentVehicle.custom_model} onChange={(e) => setCurrentVehicle({ ...currentVehicle, custom_model: e.target.value })} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Kennzeichen</Label>
                <Input className="mt-1 bg-card border-border" placeholder="z.B. AB 123 CD" value={currentVehicle.license_plate} onChange={(e) => setCurrentVehicle({ ...currentVehicle, license_plate: e.target.value })} />
              </div>
              <div>
                <Label>Halter / Info</Label>
                <Input className="mt-1 bg-card border-border" placeholder="Fahrzeughalter, Bemerkungen..." value={currentVehicle.owner_info} onChange={(e) => setCurrentVehicle({ ...currentVehicle, owner_info: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Primärfarbe</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" className="w-10 h-10 p-1 rounded bg-card border-border cursor-pointer" value={currentVehicle.primary_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, primary_color: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground font-mono">{currentVehicle.primary_color}</span>
                </div>
              </div>
              <div>
                <Label>Perlfarbe</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" className="w-10 h-10 p-1 rounded bg-card border-border cursor-pointer" value={currentVehicle.pearl_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, pearl_color: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground font-mono">{currentVehicle.pearl_color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button size="sm" onClick={addVehicle}>{editingIndex !== null ? "Änderungen übernehmen" : "Fahrzeug übernehmen"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowVehicleForm(false); setEditingIndex(null); setCurrentVehicle({ ...emptyVehicle }); }}>Abbrechen</Button>
            </div>
          </div>
        )}
      </div>

      {/* Besatzung */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Besatzung</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Pilot", value: pilot, set: setPilot },
            { label: "Co-Pilot", value: coPilot, set: setCoPilot },
            { label: "Left Gunner", value: leftGunner, set: setLeftGunner },
            { label: "Right Gunner", value: rightGunner, set: setRightGunner },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <Label>{label}</Label>
              <div className="relative mt-1">
                <Input
                  className="bg-background border-border"
                  placeholder={`${label} eingeben oder wählen...`}
                  value={value === "none" ? "" : value}
                  onChange={(e) => set(e.target.value)}
                  list={`${label}-list`}
                />
                <datalist id={`${label}-list`}>
                  {members?.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {(m as any).internal_dienstnummer ? `[${(m as any).internal_dienstnummer}]` : ""} {m.dienstnummer ? `(${m.dienstnummer})` : ""}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <Button onClick={() => saveMission.mutate()} disabled={!location || saveMission.isPending} className="px-8">
          {saveMission.isPending ? "Speichere..." : "Einsatz speichern"}
        </Button>
        <Button variant="outline" onClick={resetForm}>Zurücksetzen</Button>
      </div>
    </div>
  );
};

export default EinsatzPage;
