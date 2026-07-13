import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Car } from "lucide-react";
import { logActivity } from "@/lib/activityLog";
import { createEmptyVehicleForm, normalizeVehicleForm, type VehicleFormData } from "@/lib/vehicleForm";

const LOCATIONS = ["Staatsbank","Juwelier","Human Labs","Geiselnahme","10-12 Laden","1000 Laden","Paleto Bank","Sandy Laden","Razzia","Panikbutton","Sonstiges"];
const VEHICLE_TYPES = ["Fahrzeug","Motorrad","Helikopter","Boot"];
const VEHICLE_MODELS = ["Drafter","VSTR","Sultan Classic","Sultan Revolter","Schafter","Jugular","Chino Custom","Faction Custom","Benefactor","Schlagen","Schneider","BFB 100","Super Volito","Skyhawk","Null","Sonstiges"];

interface VehicleForm extends VehicleFormData {
  id?: string;
  _isNew?: boolean;
  _deleted?: boolean;
}

const emptyVehicle: VehicleForm = createEmptyVehicleForm();

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "mission" | "pursuit";
  data: any | null;
}

export const ProtokollEditDialog = ({ open, onOpenChange, type, data }: Props) => {
  const qc = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members-select-edit"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, dienstnummer, internal_dienstnummer").eq("is_approved", true);
      return data || [];
    },
  });

  const { data: gangs } = useQuery({
    queryKey: ["gangs-edit"],
    queryFn: async () => {
      const { data } = await supabase.from("gangs").select("id, name, image_url");
      return data || [];
    },
    enabled: type === "mission",
  });

  // ===== MISSION STATE =====
  const [mDesc, setMDesc] = useState("");
  const [mLocation, setMLocation] = useState("");
  const [mCustomLocation, setMCustomLocation] = useState("");
  const [mTatzeit, setMTatzeit] = useState("");
  const [mSuspects, setMSuspects] = useState("1");
  const [mHostages, setMHostages] = useState("0");
  const [mGangId, setMGangId] = useState("none");
  const [mGangInfo, setMGangInfo] = useState("");
  const [mProtokollschreiber, setMProtokollschreiber] = useState("");
  const [mPilot, setMPilot] = useState("");
  const [mCoPilot, setMCoPilot] = useState("");
  const [mLeftGunner, setMLeftGunner] = useState("");
  const [mRightGunner, setMRightGunner] = useState("");
  const [mVehicles, setMVehicles] = useState<VehicleForm[]>([]);

  // ===== PURSUIT STATE =====
  const [pDesc, setPDesc] = useState("");
  const [pVehicleModel, setPVehicleModel] = useState("");
  const [pLicensePlate, setPLicensePlate] = useState("");
  const [pPursuitDate, setPPursuitDate] = useState("");
  const [pPilot, setPPilot] = useState("");
  const [pCoPilot, setPCoPilot] = useState("");
  const [pLeftGunner, setPLeftGunner] = useState("");
  const [pRightGunner, setPRightGunner] = useState("");

  useEffect(() => {
    if (!open || !data) return;
    if (type === "mission") {
      const isCustomLoc = !LOCATIONS.includes(data.location_type);
      setMDesc(data.description || "");
      setMLocation(isCustomLoc ? "Sonstiges" : data.location_type || "");
      setMCustomLocation(isCustomLoc ? data.location_type : (data.custom_location || ""));
      setMTatzeit(toLocalInput(data.tatzeit));
      setMSuspects(String(data.suspects_count ?? 1));
      setMHostages(String(data.hostages_count ?? 0));
      setMGangId(data.gang_id || "none");
      setMGangInfo(data.gang_info || "");
      setMProtokollschreiber(data.protokollschreiber || "");
      setMPilot(data.pilot || "");
      setMCoPilot(data.co_pilot || "");
      setMLeftGunner(data.left_gunner || "");
      setMRightGunner(data.right_gunner || "");
      const vs = (data.mission_vehicles || []) as any[];
      setMVehicles(
        vs.map((v) => {
          const isCustomModel = !VEHICLE_MODELS.includes(v.model);
          return {
            id: v.id,
            vehicle_type: v.vehicle_type || "Fahrzeug",
            model: isCustomModel ? "Sonstiges" : v.model,
            custom_model: isCustomModel ? v.model : (v.custom_model || ""),
            license_plate: v.license_plate || "",
            owner_info: v.owner_info || "",
            primary_color: v.primary_color || "#000000",
            pearl_color: v.pearl_color || "#000000",
          };
        })
      );
    } else {
      setPDesc(data.description || "");
      setPVehicleModel(data.vehicle_model || "");
      setPLicensePlate(data.license_plate || "");
      setPPursuitDate(toLocalInput(data.pursuit_date));
      setPPilot(data.pilot || "");
      setPCoPilot(data.co_pilot || "");
      setPLeftGunner(data.left_gunner || "");
      setPRightGunner(data.right_gunner || "");
    }
  }, [open, data, type]);

  const saveMission = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const locValue = mLocation === "Sonstiges" ? mCustomLocation : mLocation;
      const updatePayload = {
        description: mDesc || null,
        location_type: locValue,
        custom_location: mLocation === "Sonstiges" ? mCustomLocation : null,
        tatzeit: mTatzeit ? new Date(mTatzeit).toISOString() : data.tatzeit,
        suspects_count: parseInt(mSuspects) || 0,
        hostages_count: parseInt(mHostages) || 0,
        gang_id: mGangId && mGangId !== "none" ? mGangId : null,
        gang_info: mGangInfo || null,
        protokollschreiber: mProtokollschreiber || null,
        pilot: mPilot && mPilot !== "none" ? mPilot : null,
        co_pilot: mCoPilot && mCoPilot !== "none" ? mCoPilot : null,
        left_gunner: mLeftGunner && mLeftGunner !== "none" ? mLeftGunner : null,
        right_gunner: mRightGunner && mRightGunner !== "none" ? mRightGunner : null,
      };
      const { error } = await supabase.from("missions").update(updatePayload).eq("id", data.id);
      if (error) throw error;

      // Field-level changes for activity log
      const FIELD_LABELS: Record<string, string> = {
        description: "Beschreibung",
        location_type: "Raubart",
        tatzeit: "Tatzeit",
        suspects_count: "Tatverdächtige",
        hostages_count: "Geiseln",
        gang_id: "Familie/Bande",
        gang_info: "Bande-Infos",
        protokollschreiber: "Protokollschreiber",
        pilot: "Pilot",
        co_pilot: "Co-Pilot",
        left_gunner: "Left Gunner",
        right_gunner: "Right Gunner",
      };
      const norm = (v: any) => {
        if (v === null || v === undefined || v === "") return null;
        if (v instanceof Date) return v.toISOString();
        return v;
      };
      const fieldChanges: Array<{ field: string; from: any; to: any }> = [];
      for (const key of Object.keys(FIELD_LABELS)) {
        const before = norm((data as any)[key]);
        const after = norm((updatePayload as any)[key]);
        if (key === "tatzeit") {
          // Compare as ISO without ms differences
          if (new Date(before as any).getTime() !== new Date(after as any).getTime()) {
            fieldChanges.push({ field: FIELD_LABELS[key], from: before, to: after });
          }
          continue;
        }
        if (String(before ?? "") !== String(after ?? "")) {
          fieldChanges.push({ field: FIELD_LABELS[key], from: before, to: after });
        }
      }

      // Vehicles diff
      const vehicleChanges: Array<{ action: "added" | "updated" | "deleted"; label: string; fields?: string[] }> = [];
      const VFIELD_LABELS: Record<string, string> = {
        vehicle_type: "Art",
        model: "Modell",
        license_plate: "Kennzeichen",
        owner_info: "Besitzer",
        primary_color: "Farbe Primär",
        pearl_color: "Pearl",
      };
      const originalVehicles = ((data.mission_vehicles || []) as any[]).reduce<Record<string, any>>((acc, v) => { acc[v.id] = v; return acc; }, {});
      for (const v of mVehicles) {
        const modelValue = v.model === "Sonstiges" ? v.custom_model : v.model;
        const payload = {
          vehicle_type: v.vehicle_type,
          model: modelValue,
          custom_model: v.model === "Sonstiges" ? v.custom_model : null,
          license_plate: v.license_plate || null,
          owner_info: v.owner_info || null,
          primary_color: v.primary_color,
          pearl_color: v.pearl_color,
        };
        const labelOf = (mdl: string, plate?: string | null) => `${mdl}${plate ? ` (${plate})` : ""}`;
        if (v._deleted && v.id) {
          await supabase.from("mission_vehicles").delete().eq("id", v.id);
          const orig = originalVehicles[v.id];
          if (orig) vehicleChanges.push({ action: "deleted", label: labelOf(orig.model, orig.license_plate) });
        } else if (v._isNew) {
          await supabase.from("mission_vehicles").insert({ mission_id: data.id, ...payload });
          vehicleChanges.push({ action: "added", label: labelOf(modelValue, payload.license_plate) });
        } else if (v.id) {
          await supabase.from("mission_vehicles").update(payload).eq("id", v.id);
          const orig = originalVehicles[v.id];
          if (orig) {
            const changedFields: string[] = [];
            for (const k of Object.keys(VFIELD_LABELS)) {
              const a = (orig as any)[k];
              const b = (payload as any)[k];
              if (String(a ?? "") !== String(b ?? "")) changedFields.push(VFIELD_LABELS[k]);
            }
            if (changedFields.length > 0) {
              vehicleChanges.push({ action: "updated", label: labelOf(modelValue, payload.license_plate), fields: changedFields });
            }
          }
        }
      }

      return { fieldChanges, vehicleChanges };
    },
    onSuccess: (result) => {
      toast.success("Protokoll aktualisiert");
      qc.invalidateQueries({ queryKey: ["missions"] });
      const fieldChanges = result?.fieldChanges || [];
      const vehicleChanges = result?.vehicleChanges || [];
      const summary: string[] = [];
      if (fieldChanges.length > 0) summary.push(...fieldChanges.map((c) => c.field));
      if (vehicleChanges.length > 0) {
        const added = vehicleChanges.filter((v) => v.action === "added").length;
        const deleted = vehicleChanges.filter((v) => v.action === "deleted").length;
        const updated = vehicleChanges.filter((v) => v.action === "updated").length;
        if (added) summary.push(`Fahrzeug hinzugefügt (${added})`);
        if (deleted) summary.push(`Fahrzeug gelöscht (${deleted})`);
        if (updated) summary.push(`Fahrzeug bearbeitet (${updated})`);
      }
      logActivity("Einsatz-Protokoll bearbeitet", "einsatz", {
        mission_id: data?.id,
        location: data?.location_type,
        changed_fields: summary,
        changes: fieldChanges,
        vehicle_changes: vehicleChanges,
      });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const savePursuit = useMutation({
    mutationFn: async () => {
      if (!data) return { fieldChanges: [] };
      const updatePayload = {
        description: pDesc || null,
        vehicle_model: pVehicleModel || null,
        license_plate: pLicensePlate || null,
        pursuit_date: pPursuitDate ? new Date(pPursuitDate).toISOString() : data.pursuit_date,
        pilot: pPilot && pPilot !== "none" ? pPilot : null,
        co_pilot: pCoPilot && pCoPilot !== "none" ? pCoPilot : null,
        left_gunner: pLeftGunner && pLeftGunner !== "none" ? pLeftGunner : null,
        right_gunner: pRightGunner && pRightGunner !== "none" ? pRightGunner : null,
      };
      const { error } = await supabase.from("pursuits").update(updatePayload).eq("id", data.id);
      if (error) throw error;

      const FIELD_LABELS: Record<string, string> = {
        description: "Beschreibung",
        vehicle_model: "Fahrzeug",
        license_plate: "Kennzeichen",
        pursuit_date: "Datum/Uhrzeit",
        pilot: "Pilot",
        co_pilot: "Co-Pilot",
        left_gunner: "Left Gunner",
        right_gunner: "Right Gunner",
      };
      const fieldChanges: Array<{ field: string; from: any; to: any }> = [];
      for (const key of Object.keys(FIELD_LABELS)) {
        const before = (data as any)[key] ?? null;
        const after = (updatePayload as any)[key] ?? null;
        if (key === "pursuit_date") {
          if (new Date(before).getTime() !== new Date(after).getTime()) {
            fieldChanges.push({ field: FIELD_LABELS[key], from: before, to: after });
          }
          continue;
        }
        if (String(before ?? "") !== String(after ?? "")) {
          fieldChanges.push({ field: FIELD_LABELS[key], from: before, to: after });
        }
      }
      return { fieldChanges };
    },
    onSuccess: (result) => {
      toast.success("Verfolgung aktualisiert");
      qc.invalidateQueries({ queryKey: ["pursuits"] });
      const fieldChanges = result?.fieldChanges || [];
      logActivity("Verfolgung bearbeitet", "verfolgung", {
        pursuit_id: data?.id,
        plate: data?.license_plate,
        changed_fields: fieldChanges.map((c) => c.field),
        changes: fieldChanges,
      });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const memberOptions = (members || []) as any[];

  const renderCrewSelect = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value || "none"} onValueChange={onChange}>
        <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="–" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">– Keiner –</SelectItem>
          {memberOptions.map((m) => (
            <SelectItem key={m.id} value={m.name}>
              {m.name}{m.internal_dienstnummer ? ` [${m.internal_dienstnummer}]` : ""}{m.dienstnummer ? ` (${m.dienstnummer})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Pencil className="w-4 h-4" /> {type === "mission" ? "Einsatz bearbeiten" : "Verfolgung bearbeiten"}
          </DialogTitle>
        </DialogHeader>

        {type === "mission" ? (
          <div className="space-y-5 pt-2">
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} className="mt-1 bg-background border-border min-h-[80px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Raubart</Label>
                <Select value={mLocation} onValueChange={setMLocation}>
                  <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Raubart..." /></SelectTrigger>
                  <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {mLocation === "Sonstiges" && (
                  <Input className="mt-2 bg-background border-border" placeholder="Eigener Ort" value={mCustomLocation} onChange={(e) => setMCustomLocation(e.target.value)} />
                )}
              </div>
              <div>
                <Label>Tatzeitraum</Label>
                <Input type="datetime-local" value={mTatzeit} onChange={(e) => setMTatzeit(e.target.value)} className="mt-1 bg-background border-border" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tatverdächtige</Label>
                <Input type="number" min={0} value={mSuspects} onChange={(e) => setMSuspects(e.target.value)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>Geiseln</Label>
                <Input type="number" min={0} value={mHostages} onChange={(e) => setMHostages(e.target.value)} className="mt-1 bg-background border-border" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Familie / Bande</Label>
                <Select value={mGangId} onValueChange={setMGangId}>
                  <SelectTrigger className="mt-1 bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine / Unbekannt</SelectItem>
                    {gangs?.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        <span className="flex items-center gap-2">
                          {g.image_url ? (
                            <img src={g.image_url} alt="" loading="lazy" decoding="async" className="w-5 h-5 rounded-full object-cover border border-border shrink-0" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-muted shrink-0" />
                          )}
                          {g.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weitere Bande-Infos</Label>
                <Input className="mt-1 bg-background border-border" value={mGangInfo} onChange={(e) => setMGangInfo(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Protokollschreiber</Label>
              <Select value={mProtokollschreiber} onValueChange={setMProtokollschreiber}>
                <SelectTrigger className="mt-1 bg-background border-border"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  {memberOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}{m.internal_dienstnummer ? ` [${m.internal_dienstnummer}]` : ""}{m.dienstnummer ? ` (${m.dienstnummer})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border rounded-lg p-4 bg-background/40 space-y-3">
              <p className="text-sm font-bold text-primary">Besatzung</p>
              <div className="grid grid-cols-2 gap-3">
                {renderCrewSelect("Pilot", mPilot, setMPilot)}
                {renderCrewSelect("Co-Pilot", mCoPilot, setMCoPilot)}
                {renderCrewSelect("Left Gunner", mLeftGunner, setMLeftGunner)}
                {renderCrewSelect("Right Gunner", mRightGunner, setMRightGunner)}
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-background/40 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-primary flex items-center gap-2"><Car className="w-4 h-4" /> Fahrzeuge</p>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setMVehicles([...mVehicles, { ...emptyVehicle, _isNew: true }])}>
                  <Plus className="w-3.5 h-3.5" /> Hinzufügen
                </Button>
              </div>
              {mVehicles.filter((v) => !v._deleted).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Keine Fahrzeuge</p>
              )}
              {mVehicles.map((v, i) => v._deleted ? null : (
                <div key={i} className="border border-border/60 rounded-md p-3 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Fahrzeug {i + 1}</p>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => {
                      const updated = [...mVehicles];
                      if (v._isNew) updated.splice(i, 1);
                      else updated[i] = { ...v, _deleted: true };
                      setMVehicles(updated);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Art</Label>
                      <Select value={v.vehicle_type} onValueChange={(val) => { const u = [...mVehicles]; u[i] = { ...v, vehicle_type: val }; setMVehicles(u); }}>
                        <SelectTrigger className="mt-1 bg-background border-border h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Modell</Label>
                      <Select value={v.model} onValueChange={(val) => { const u = [...mVehicles]; u[i] = { ...v, model: val }; setMVehicles(u); }}>
                        <SelectTrigger className="mt-1 bg-background border-border h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{VEHICLE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                      {v.model === "Sonstiges" && (
                        <Input className="mt-1 bg-background border-border h-9" placeholder="Eigenes Modell" value={v.custom_model} onChange={(e) => { const u = [...mVehicles]; u[i] = { ...v, custom_model: e.target.value }; setMVehicles(u); }} />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Primärfarbe</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input type="color" className="w-10 h-9 p-1 bg-background border-border cursor-pointer" value={v.primary_color} onChange={(e) => { const u = [...mVehicles]; u[i] = { ...v, primary_color: e.target.value }; setMVehicles(u); }} />
                        <span className="text-[10px] text-muted-foreground font-mono">{v.primary_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Perlfarbe</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input type="color" className="w-10 h-9 p-1 bg-background border-border cursor-pointer" value={v.pearl_color} onChange={(e) => { const u = [...mVehicles]; u[i] = { ...v, pearl_color: e.target.value }; setMVehicles(u); }} />
                        <span className="text-[10px] text-muted-foreground font-mono">{v.pearl_color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card pb-1">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
              <Button onClick={() => saveMission.mutate()} disabled={saveMission.isPending}>
                {saveMission.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} className="mt-1 bg-background border-border min-h-[80px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fahrzeug</Label>
                <Input value={pVehicleModel} onChange={(e) => setPVehicleModel(e.target.value)} className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>Kennzeichen</Label>
                <Input value={pLicensePlate} onChange={(e) => setPLicensePlate(e.target.value)} className="mt-1 bg-background border-border" />
              </div>
            </div>

            <div>
              <Label>Datum & Uhrzeit</Label>
              <Input type="datetime-local" value={pPursuitDate} onChange={(e) => setPPursuitDate(e.target.value)} className="mt-1 bg-background border-border" />
            </div>

            <div className="border border-border rounded-lg p-4 bg-background/40 space-y-3">
              <p className="text-sm font-bold text-primary">Besatzung</p>
              <div className="grid grid-cols-2 gap-3">
                {renderCrewSelect("Pilot", pPilot, setPPilot)}
                {renderCrewSelect("Co-Pilot", pCoPilot, setPCoPilot)}
                {renderCrewSelect("Left Gunner", pLeftGunner, setPLeftGunner)}
                {renderCrewSelect("Right Gunner", pRightGunner, setPRightGunner)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
              <Button onClick={() => savePursuit.mutate()} disabled={savePursuit.isPending}>
                {savePursuit.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProtokollEditDialog;