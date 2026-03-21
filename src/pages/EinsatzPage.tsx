import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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
        gang_id: gangId || null,
        pilot, co_pilot: coPilot, left_gunner: leftGunner, right_gunner: rightGunner,
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
    onSuccess: () => {
      toast.success("Einsatz gespeichert!");
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setDesc(""); setLocation(""); setCustomLocation(""); setTatzeit("");
    setSuspects("1"); setHostages("0"); setGangId("");
    setPilot(""); setCoPilot(""); setLeftGunner(""); setRightGunner("");
    setVehicles([]); setShowVehicleForm(false);
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { ...currentVehicle }]);
    setCurrentVehicle({ ...emptyVehicle });
    setShowVehicleForm(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-primary">Einsatz erstellen</h1>

      {/* Protokollschreiber */}
      <div>
        <Label className="text-primary">Protokollschreiber</Label>
        <Select>
          <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Bitte auswählen" /></SelectTrigger>
          <SelectContent>
            {members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} {m.dienstnummer ? `(${m.dienstnummer})` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Raubinformationen */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-bold text-primary">Raubinformationen / Geiselnahme</h2>
        <Textarea placeholder="Beschreibung des Einsatzes" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-input border-border" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Was für ein Raub?</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Bitte auswählen" /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            {location === "Sonstiges" && (
              <Input className="mt-2 bg-card border-border" placeholder="Eigener Ort" value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} />
            )}
          </div>
          <div>
            <Label>Tatzeitraum</Label>
            <Input type="datetime-local" value={tatzeit} onChange={(e) => setTatzeit(e.target.value)} className="bg-card border-border" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Anzahl Tatverdächtige</Label>
            <Select value={suspects} onValueChange={setSuspects}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Anzahl der Geiseln</Label>
            <Select value={hostages} onValueChange={setHostages}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 21 }, (_, i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Infos zur Bande</Label>
          <Select value={gangId} onValueChange={setGangId}>
            <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Bitte Auswählen" /></SelectTrigger>
            <SelectContent>{gangs?.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Fahrzeuge */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary">Fahrzeuge</h2>
          <Button variant="outline" size="sm" onClick={() => setShowVehicleForm(true)}>Fahrzeug hinzufügen</Button>
        </div>

        {showVehicleForm && (
          <div className="space-y-3 border border-border rounded-md p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Art</Label>
                <Select value={currentVehicle.vehicle_type} onValueChange={(v) => setCurrentVehicle({ ...currentVehicle, vehicle_type: v })}>
                  <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modell</Label>
                <Select value={currentVehicle.model} onValueChange={(v) => setCurrentVehicle({ ...currentVehicle, model: v })}>
                  <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                {currentVehicle.model === "Sonstiges" && (
                  <Input className="mt-2 bg-card border-border" placeholder="Eigenes Modell" value={currentVehicle.custom_model} onChange={(e) => setCurrentVehicle({ ...currentVehicle, custom_model: e.target.value })} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Kennzeichen</Label><Input className="bg-card border-border" value={currentVehicle.license_plate} onChange={(e) => setCurrentVehicle({ ...currentVehicle, license_plate: e.target.value })} /></div>
              <div><Label>Besitzer & Geb. Datum</Label><Input className="bg-card border-border" placeholder="Name, TT.MM.JJJJ" value={currentVehicle.owner_info} onChange={(e) => setCurrentVehicle({ ...currentVehicle, owner_info: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Primär Farbe</Label><div className="flex gap-2"><Input type="color" className="w-10 h-10 p-1 bg-card border-border" value={currentVehicle.primary_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, primary_color: e.target.value })} /></div></div>
              <div><Label>Sekundär Farbe</Label><div className="flex gap-2"><Input type="color" className="w-10 h-10 p-1 bg-card border-border" value={currentVehicle.secondary_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, secondary_color: e.target.value })} /></div></div>
              <div><Label>Pearl Farbe</Label><div className="flex gap-2"><Input type="color" className="w-10 h-10 p-1 bg-card border-border" value={currentVehicle.pearl_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, pearl_color: e.target.value })} /></div></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Unterboden (Neon)</Label><div className="flex gap-2"><Input type="color" className="w-10 h-10 p-1 bg-card border-border" value={currentVehicle.neon_color} onChange={(e) => setCurrentVehicle({ ...currentVehicle, neon_color: e.target.value })} /></div></div>
              <div><Label>Xenon</Label><div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={currentVehicle.xenon} onChange={(e) => setCurrentVehicle({ ...currentVehicle, xenon: e.target.checked })} /></div></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={addVehicle}>Hinzufügen</Button>
              <Button size="sm" variant="destructive" onClick={() => setShowVehicleForm(false)}>Abbrechen</Button>
            </div>
          </div>
        )}

        {vehicles.length === 0 && !showVehicleForm && <p className="text-sm text-muted-foreground">Keine Fahrzeuge hinzugefügt.</p>}
        {vehicles.map((v, i) => (
          <div key={i} className="text-sm border border-border/50 rounded p-2 flex justify-between">
            <span>{v.vehicle_type} {v.model === "Sonstiges" ? v.custom_model : v.model} – {v.license_plate || "Kein Kennzeichen"}</span>
            <button className="text-destructive text-xs" onClick={() => setVehicles(vehicles.filter((_, j) => j !== i))}>Entfernen</button>
          </div>
        ))}
      </div>

      {/* Besatzung */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-bold text-primary">Besatzung</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Pilot</Label><Input className="bg-card border-border" value={pilot} onChange={(e) => setPilot(e.target.value)} placeholder="PD-01" /></div>
          <div><Label>Co-Pilot</Label><Input className="bg-card border-border" value={coPilot} onChange={(e) => setCoPilot(e.target.value)} placeholder="PD-01" /></div>
          <div><Label>Left Gunner</Label><Input className="bg-card border-border" value={leftGunner} onChange={(e) => setLeftGunner(e.target.value)} placeholder="PD-01" /></div>
          <div><Label>Right Gunner</Label><Input className="bg-card border-border" value={rightGunner} onChange={(e) => setRightGunner(e.target.value)} placeholder="PD-01" /></div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button onClick={() => saveMission.mutate()} disabled={!location || saveMission.isPending}>
          {saveMission.isPending ? "Speichere..." : "Einsatz speichern"}
        </Button>
        <Button variant="secondary" onClick={resetForm}>Zurücksetzen</Button>
      </div>
    </div>
  );
};

export default EinsatzPage;
