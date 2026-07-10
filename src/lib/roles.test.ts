import { describe, expect, it } from "vitest";
import { getEffectiveRole, hasAdminPermissions, type AppRole } from "./roles";

describe("role helpers", () => {
  it("returns the base effective role and keeps admin permission separate", () => {
    const roles: AppRole[] = ["ausbilder", "admin"];
    expect(getEffectiveRole(roles)).toBe("ausbilder");
    expect(hasAdminPermissions(roles)).toBe(true);
  });

  it("keeps non-admin roles without admin permissions", () => {
    const roles: AppRole[] = ["ausbilder", "member"];
    expect(getEffectiveRole(roles)).toBe("ausbilder");
    expect(hasAdminPermissions(roles)).toBe(false);
  });

  it("returns admin when only admin is assigned", () => {
    const roles: AppRole[] = ["admin"];
    expect(getEffectiveRole(roles)).toBe("admin");
    expect(hasAdminPermissions(roles)).toBe(true);
  });
});
