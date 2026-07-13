import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";
import { nowRoundedForInput } from "@/lib/dateUtils";

/**
 * Converts a datetime-local string (e.g., "2025-07-13T14:30") which represents Berlin time
 * to an ISO UTC string.
 */
function convertLocalToUTC(localString: string): string {
  if (!localString) return new Date().toISOString();

  // Parse the datetime-local value (format: "2025-07-13T14:30")
  const [datePart, timePart] = localString.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");

  // Create a date object with Berlin timezone
  // We interpret the input as Berlin time, then convert to UTC
  const formatter = new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Berlin",
  });

  // Create a temporary date (any date in UTC)
  const tempDate = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    0
  );

  // Get the Berlin time parts
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
  }).formatToParts(tempDate);

  const berlSeconds = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const offsetMs =
    new Date(
      parseInt(berlSeconds.year),
      parseInt(berlSeconds.month) - 1,
      parseInt(berlSeconds.day),
      parseInt(berlSeconds.hour),
      parseInt(berlSeconds.minute),
      parseInt(berlSeconds.second)
    ).getTime() - tempDate.getTime();

  const utcDate = new Date(tempDate.getTime() + offsetMs);
  return utcDate.toISOString();
}

/**
 * Converts a UTC ISO string to a datetime-local string in Berlin timezone.
 * E.g., "2025-07-13T12:30:00Z" → "2025-07-13T14:30"
 */
function toLocalInput(isoString: string): string {
  if (!isoString) return "";

  const date = new Date(isoString);

  // Format as Berlin time
  const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
  });

  const parts = berlinFormatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeStr = `${partMap.hour}:${partMap.minute}`;

  return `${dateStr}T${timeStr}`;
}

interface ProtokollEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "mission" | "pursuit";
  data: any | null;
}

export function ProtokollEditDialog({ open, onOpenChange, type, data }: ProtokollEditDialogProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Mission state
  const [missionLocationTypes, setMissionLocationTypes] = useState<string[]>([]);
  const [missionData, setMissionData] = useState<any>({
    location_type: "",
    custom_location: "",
    tatzeit: "",
    suspects_count: 1,
    hostages_count: 0,
    gang_info: "",
    description: "",
    pilot: "",
    co_pilot: "",
    left_gunner: "",
    right_gunner: "",
  });

  // Pursuit state
  const [pursuitData, setPursuitData] = useState<any>({
    pursuer: "",
    pursuit_date: "",
    vehicle_model: "",
    license_plate: "",
    pilot: "",
    co_pilot: "",
    left_gunner: "",
    right_gunner: "",
    supporters: "",
    description: "",
  });

  // Load mission location types (cached)
  const { data: locationTypesData } = useQuery({
    queryKey: ["mission-location-types"],
    queryFn: async () => {
      // Get unique location types from existing missions
      const { data } = await supabase
        .from("missions")
        .select("location_type")
        .not("location_type", "is", null);
      const types = [...new Set((data || []).map((m) => m.location_type))].filter(Boolean);
      return types;
    },
  });

  // Update state when dialog opens with new data
  useEffect(() => {
    if (!open || !data) return;

    if (type === "mission") {
      setMissionData({
        location_type: data.location_type || "",
        custom_location: data.custom_location || "",
        tatzeit: toLocalInput(data.tatzeit),
        suspects_count: data.suspects_count || 1,
        hostages_count: data.hostages_count || 0,
        gang_info: data.gang_info || "",
        description: data.description || "",
        pilot: data.pilot || "",
        co_pilot: data.co_pilot || "",
        left_gunner: data.left_gunner || "",
        right_gunner: data.right_gunner || "",
      });
    } else {
      setPursuitData({
        pursuer: data.pursuer || "",
        pursuit_date: toLocalInput(data.pursuit_date),
        vehicle_model: data.vehicle_model || "",
        license_plate: data.license_plate || "",
        pilot: data.pilot || "",
        co_pilot: data.co_pilot || "",
        left_gunner: data.left_gunner || "",
        right_gunner: data.right_gunner || "",
        supporters: data.supporters || "",
        description: data.description || "",
      });
    }
  }, [open, data, type]);

  // Update location types
  useEffect(() => {
    if (locationTypesData) {
      setMissionLocationTypes(locationTypesData);
    }
  }, [locationTypesData]);

  // Save mission mutation
  const saveMissionMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        location_type: missionData.location_type,
        custom_location: missionData.custom_location || null,
        tatzeit: convertLocalToUTC(missionData.tatzeit),
        suspects_count: parseInt(missionData.suspects_count) || 1,
        hostages_count: parseInt(missionData.hostages_count) || 0,
        gang_info: missionData.gang_info || null,
        description: missionData.description || null,
        pilot: missionData.pilot || null,
        co_pilot: missionData.co_pilot || null,
        left_gunner: missionData.left_gunner || null,
        right_gunner: missionData.right_gunner || null,
      };

      const { error } = await supabase
        .from("missions")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success("Mission erfolgreich aktualisiert");
      logActivity("Mission bearbeitet", "einsatz", { mission_id: data.id });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Save pursuit mutation
  const savePursuitMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        pursuer: pursuitData.pursuer || "",
        pursuit_date: convertLocalToUTC(pursuitData.pursuit_date),
        vehicle_model: pursuitData.vehicle_model || null,
        license_plate: pursuitData.license_plate || null,
        pilot: pursuitData.pilot || null,
        co_pilot: pursuitData.co_pilot || null,
        left_gunner: pursuitData.left_gunner || null,
        right_gunner: pursuitData.right_gunner || null,
        supporters: pursuitData.supporters || null,
        description: pursuitData.description || null,
      };

      const { error } = await supabase
        .from("pursuits")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pursuits"] });
      toast.success("Verfolgung erfolgreich aktualisiert");
      logActivity("Verfolgung bearbeitet", "verfolgung", { pursuit_id: data.id });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    if (type === "mission") {
      saveMissionMutation.mutate();
    } else {
      savePursuitMutation.mutate();
    }
  };

  const title = type === "mission" ? "Mission bearbeiten" : "Verfolgung bearbeiten";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {type === "mission" ? (
          <div className="space-y-4">
            {/* Location Type */}
            <div className="space-y-2">
              <Label>Einsatzort</Label>
              <Select
                value={missionData.location_type}
                onValueChange={(value) =>
                  setMissionData({ ...missionData, location_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wähle einen Einsatzort" />
                </SelectTrigger>
                <SelectContent>
                  {missionLocationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Location */}
            {missionData.location_type === "Sonstiges" && (
              <div className="space-y-2">
                <Label>Benutzerdefinierter Ort</Label>
                <Input
                  value={missionData.custom_location}
                  onChange={(e) =>
                    setMissionData({ ...missionData, custom_location: e.target.value })
                  }
                  placeholder="z.B. Polizeiwache"
                />
              </div>
            )}

            {/* DateTime */}
            <div className="space-y-2">
              <Label>Tatzeit (Berlin-Zeit)</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={missionData.tatzeit}
                  onChange={(e) =>
                    setMissionData({ ...missionData, tatzeit: e.target.value })
                  }
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={() => setMissionData({ ...missionData, tatzeit: nowRoundedForInput() })}>Jetzt</Button>
              </div>
            </div>

            {/* Suspects & Hostages */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Verdächtige</Label>
                <Input
                  type="number"
                  min="0"
                  value={missionData.suspects_count}
                  onChange={(e) =>
                    setMissionData({ ...missionData, suspects_count: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Geiseln</Label>
                <Input
                  type="number"
                  min="0"
                  value={missionData.hostages_count}
                  onChange={(e) =>
                    setMissionData({ ...missionData, hostages_count: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Gang Info */}
            <div className="space-y-2">
              <Label>Gang-Information</Label>
              <Input
                value={missionData.gang_info}
                onChange={(e) =>
                  setMissionData({ ...missionData, gang_info: e.target.value })
                }
                placeholder="z.B. Name, Kategorie"
              />
            </div>

            {/* Crew */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Besatzung</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pilot</Label>
                  <Input
                    value={missionData.pilot}
                    onChange={(e) =>
                      setMissionData({ ...missionData, pilot: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Co-Pilot</Label>
                  <Input
                    value={missionData.co_pilot}
                    onChange={(e) =>
                      setMissionData({ ...missionData, co_pilot: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Linker Schütze</Label>
                  <Input
                    value={missionData.left_gunner}
                    onChange={(e) =>
                      setMissionData({ ...missionData, left_gunner: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rechter Schütze</Label>
                  <Input
                    value={missionData.right_gunner}
                    onChange={(e) =>
                      setMissionData({ ...missionData, right_gunner: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={missionData.description}
                onChange={(e) =>
                  setMissionData({ ...missionData, description: e.target.value })
                }
                placeholder="Weitere Details..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pursuer */}
            <div className="space-y-2">
              <Label>Verfolgter</Label>
              <Input
                value={pursuitData.pursuer}
                onChange={(e) =>
                  setPursuitData({ ...pursuitData, pursuer: e.target.value })
                }
                placeholder="Name oder Beschreibung"
              />
            </div>

            {/* DateTime */}
            <div className="space-y-2">
              <Label>Verfolgungsdatum (Berlin-Zeit)</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={pursuitData.pursuit_date}
                  onChange={(e) =>
                    setPursuitData({ ...pursuitData, pursuit_date: e.target.value })
                  }
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={() => setPursuitData({ ...pursuitData, pursuit_date: nowRoundedForInput() })}>Jetzt</Button>
              </div>
            </div>

            {/* Vehicle */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fahrzeugmodell</Label>
                <Input
                  value={pursuitData.vehicle_model}
                  onChange={(e) =>
                    setPursuitData({ ...pursuitData, vehicle_model: e.target.value })
                  }
                  placeholder="z.B. Adder"
                />
              </div>
              <div className="space-y-2">
                <Label>Kennzeichen</Label>
                <Input
                  value={pursuitData.license_plate}
                  onChange={(e) =>
                    setPursuitData({ ...pursuitData, license_plate: e.target.value })
                  }
                  placeholder="z.B. ABC 123"
                />
              </div>
            </div>

            {/* Crew */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Besatzung</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pilot</Label>
                  <Input
                    value={pursuitData.pilot}
                    onChange={(e) =>
                      setPursuitData({ ...pursuitData, pilot: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Co-Pilot</Label>
                  <Input
                    value={pursuitData.co_pilot}
                    onChange={(e) =>
                      setPursuitData({ ...pursuitData, co_pilot: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Linker Schütze</Label>
                  <Input
                    value={pursuitData.left_gunner}
                    onChange={(e) =>
                      setPursuitData({ ...pursuitData, left_gunner: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rechter Schütze</Label>
                  <Input
                    value={pursuitData.right_gunner}
                    onChange={(e) =>
                      setPursuitData({ ...pursuitData, right_gunner: e.target.value })
                    }
                    placeholder="Name"
                  />
                </div>
              </div>
            </div>

            {/* Supporters */}
            <div className="space-y-2">
              <Label>Unterstützer</Label>
              <Input
                value={pursuitData.supporters}
                onChange={(e) =>
                  setPursuitData({ ...pursuitData, supporters: e.target.value })
                }
                placeholder="Name(n)"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={pursuitData.description}
                onChange={(e) =>
                  setPursuitData({ ...pursuitData, description: e.target.value })
                }
                placeholder="Weitere Details..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
