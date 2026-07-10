export interface VehicleFormData {
  vehicle_type: string;
  model: string;
  custom_model: string;
  license_plate: string;
  owner_info: string;
  primary_color: string;
  pearl_color: string;
}

export const createEmptyVehicleForm = (): VehicleFormData => ({
  vehicle_type: "Fahrzeug",
  model: "Drafter",
  custom_model: "",
  license_plate: "",
  owner_info: "",
  primary_color: "#000000",
  pearl_color: "#000000",
});

export const normalizeVehicleForm = (vehicle: Partial<VehicleFormData> & Record<string, any> = {}): VehicleFormData => ({
  vehicle_type: vehicle.vehicle_type || "Fahrzeug",
  model: vehicle.model || "Drafter",
  custom_model: vehicle.custom_model || "",
  license_plate: vehicle.license_plate || "",
  owner_info: vehicle.owner_info || "",
  primary_color: vehicle.primary_color || "#000000",
  pearl_color: vehicle.pearl_color || "#000000",
});
