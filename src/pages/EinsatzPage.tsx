import { useState } from "react";
import { logActivity } from "@/lib/activityLog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Car, FileText, Users, Shield } from "lucide-react";

const LOCATIONS = ["Staatsbank","Juwelier","Human Labs","Geiselnahme","10-12 Laden","1000 Laden","Paleto Bank","Sandy Laden","Razzia","Panikbutton","Sonstiges"];
const VEHICLE_TYPES = ["Fahrzeug","Motorrad","Helikopter","Boot"];
const VEHICLE_MODELS = ["Drafter","VSTR","Sultan Classic","Sultan Revolter","Schafter","Jugular","Chino Custom","Faction Custom","Benefactor","Schlagen","Schneider","BFB 100","Super Volito","Skyhawk","Null","Sonstiges"];

interface VehicleForm {
  vehicle_type: string; model: string; custom_model: string; license_plate: string;
  owner_info: string; primary_color: string; secondary_color: string;
  pearl_color: string; neon_color: string; xenon: boolean;
}

const emptyVehicle: VehicleForm = {
  vehicle_type: "Fahrzeug", model: "Drafter", custom_model: "", license_plate: "",
  owner_info: "", primary_color: "#000000", secondary_color: "#000000",
  pearl_color: "#000000", neon_color: "#000000", xenon: false,
};

const EinsatzPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [tatzeit, setTatzeit] = useState("");
  const [suspects, setSuspects] = useState("1");
  const [hostages, setHostages] = useState("0");
  const [gangId, setGangId] = useState("");
  const [gangInfo, setGangInfo] = useState("");
  const [protokollschreiber, setProtokollschreiber] = useState("");
  const [pilot, setPilot] = useState("");
  const [coPilot, setCoPilot] = useState("");
  const [leftGunner, setLeftGunner] = useState("");
  const [rightGunner, setRightGunner] = useState("");
  const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleForm>({ ...emptyVehicle });

  const { data: gangs } = useQuery({
    queryKey: ["gangs"],
    queryFn: async () => { const { data } = await supabase.from("gangs").select("*"); return data || []; },
  });

  const { data: members } = useQuery({
    queryKey: ["members-select"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, dienstnummer").eq("is_approved", true);
      return data || [];
    },
  });

  const saveMission = useMutation({
    mutationFn: async () => {
      const { data: mission, error } = await supabase.from("missions").insert({
        description: desc,
        location_type: location === "Sonstiges" ? customLocation : location,
        custom_location: location === "Sonstiges" ? customLocation : null,
        tatzeit: tatzeit || new Date().toISOString(),
        suspects_count: parseInt(suspects),
        hostages_count: parseInt(hostages),
        gang_id: gangId && gangId !== "none" ? gangId : null,
        gang_info: gangInfo || null,
        pilot: pilot && pilot !== "none" ? pilot : null,
        co_pilot: coPilot && coPilot !== "none" ? coPilot : null,
        left_gunner: leftGunner && leftGunner !== "none" ? leftGunner : null,
        right_gunner: rightGunner && rightGunner !== "none" ? rightGunner : null,
        created_by: user!.id,
        protokollschreiber: protokollschreiber || user!.id,
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
            secondary_color: v.secondary_color,
            pearl_color: v.pearl_color,
            neon_color: v.neon_color,
            xenon: v.xenon,
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
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setDesc(""); setLocation(""); setCustomLocation(""); setTatzeit("");
    setSuspects("1"); setHostages("0"); setGangId(""); setGangInfo("");
    setPilot(""); setCoPilot(""); setLeftGunner(""); setRightGunner("");
    setVehicles([]); setShowVehicleForm(false); setProtokollschreiber("");
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { ...currentVehicle }]);
    // Keep colors for next vehicle, reset everything else
    setCurrentVehicle({
      ...emptyVehicle,
      primary_color: currentVehicle.primary_color,
      secondary_color: currentVehicle.secondary_color,
      pearl_color: currentVehicle.pearl_color,
      neon_color: currentVehicle.neon_color,
    });
    setShowVehicleForm(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Einsatz erstellen</h1>
          <p className="text-xs text-muted-foreground">Neues Einsatzprotokoll anlegen</p>
        </div>
      </div>

      {/* Protokollschreiber */}
      <div className="bg-card border border-border rounded-lg p-5">
        <Label className="text-primary font-semibold text-sm">Protokollschreiber</Label>
        <Select value={protokollschreiber} onValueChange={setProtokollschreiber}>
          <SelectTrigger className="mt-2 bg-background border-border">
            <SelectValue placeholder="Bitte auswählen" />
          </SelectTrigger>
          <SelectContent>
            {members?.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} {m.dienstnummer ? `(${m.dienstnummer})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Raubinformationen */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Raubinformationen / Geiselnahme</h2>
        </div>

        <div>
          <Label>Beschreibung</Label>
          <Textarea placeholder="Kurze Beschreibung des Einsatzes..." value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 bg-background border-border min-h-[80px]" />
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
            <Input type="datetime-local" value={tatzeit} onChange={(e) => setTatzeit(e.target.value)} className="mt-1 bg-background border-border" />
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
            <Select value={gangId} onValueChange={setGangId}>
              <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Familie wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine / Unbekannt</SelectItem>
                {gangs?.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
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
                <span className="w-4 h-4 rounded-full border border-border" style={{ background: v.secondary_color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">{v.vehicle_type} – {v.model === "Sonstiges" ? v.custom_model : v.model}</p>
                <p className="text-xs text-muted-foreground">{v.license_plate || "Kein Kennzeichen"} {v.owner_info ? `· ${v.owner_info}` : ""}</p>
              </div>
            </div>
            <button onClick={() => setVehicles(vehicles.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {vehicles.length === 0 && !showVehicleForm && (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Fahrzeuge hinzugefügt</p>
        )}

        {showVehicleForm && (
          <div className="space-y-4 border border-primary/20 rounded-lg p-4 bg-background">
            <div className="grid grid-cols-2 gap-4">
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
                  <SelectContent>{VEHICLE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                {currentVehicle.model === "Sonstiges" && (
                  <Input className="mt-2 bg-card border-border" placeholder="Eigenes Modell" value={currentVehicle.custom_model} onChange={(e) => setCurrentVehicle({ ...currentVehicle, custom_model: e.target.value })} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Kennzeichen</Label><Input className="mt-1 bg-card border-border" value={currentVehicle.license_plate} onChange={(e) => setCurrentVehicle({ ...currentVehicle, license_plate: e.target.value })} /></div>
              <div><Label>Besitzer & Geb. Datum</Label><Input className="mt-1 bg-card border-border" placeholder="Name, TT.MM.JJJJ" value={currentVehicle.owner_info} onChange={(e) => setCurrentVehicle({ ...currentVehicle, owner_info: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Primär</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" className="w-10 h-10 p-1 rounded bg-card border-border cursor-pointer" value={currentVehicle.primary_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, primary_color: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground font-mono">{currentVehicle.primary_color}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Sekundär</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" className="w-10 h-10 p-1 rounded bg-card border-border cursor-pointer" value={currentVehicle.secondary_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, secondary_color: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground font-mono">{currentVehicle.secondary_color}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Pearl</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" className="w-10 h-10 p-1 rounded bg-card border-border cursor-pointer" value={currentVehicle.pearl_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, pearl_color: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground font-mono">{currentVehicle.pearl_color}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Neon</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" className="w-10 h-10 p-1 rounded bg-card border-border cursor-pointer" value={currentVehicle.neon_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, neon_color: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground font-mono">{currentVehicle.neon_color}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={currentVehicle.xenon} onCheckedChange={(v) => setCurrentVehicle({ ...currentVehicle, xenon: !!v })} id="xenon" />
              <Label htmlFor="xenon" className="text-sm cursor-pointer">Xenon-Scheinwerfer</Label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button size="sm" onClick={addVehicle}>Fahrzeug übernehmen</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowVehicleForm(false)}>Abbrechen</Button>
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
                      {m.name} {m.dienstnummer ? `(${m.dienstnummer})` : ""}
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
