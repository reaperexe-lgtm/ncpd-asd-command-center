import { describe, expect, it } from "vitest";
import { createEmptyVehicleForm, normalizeVehicleForm } from "./vehicleForm";

describe("vehicle form helpers", () => {
  it("creates a minimal vehicle form with primary and pearl colors", () => {
    const form = createEmptyVehicleForm();

    expect(form.primary_color).toBe("#000000");
    expect(form.pearl_color).toBe("#000000");
    expect(form).not.toHaveProperty("secondary_color");
  });

  it("normalizes legacy vehicle data to the minimal primary and pearl shape", () => {
    const form = normalizeVehicleForm({
      vehicle_type: "Motorrad",
      model: "Drafter",
      primary_color: "#ff0000",
      secondary_color: "#00ff00",
      pearl_color: "#0000ff",
      neon_color: "#ffffff",
      xenon: true,
    } as any);

    expect(form).toEqual({
      vehicle_type: "Motorrad",
      model: "Drafter",
      custom_model: "",
      license_plate: "",
      owner_info: "",
      primary_color: "#ff0000",
      pearl_color: "#0000ff",
    });
  });
});
