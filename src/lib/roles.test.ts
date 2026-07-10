import { describe, expect, it } from "vitest";
import { getEffectiveRole, hasAdminPermissions, type AppRole } from "./roles";

describe("role helpers", () => {
  it("prefers admin when it is assigned as a secondary role", () => {
    const roles: AppRole[] = ["ausbilder", "admin"];
    expect(getEffectiveRole(roles)).toBe("admin");
    expect(hasAdminPermissions(roles)).toBe(true);
  });

  it("keeps non-admin roles without admin permissions", () => {
    const roles: AppRole[] = ["ausbilder", "member"];
    expect(getEffectiveRole(roles)).toBe("ausbilder");
    expect(hasAdminPermissions(roles)).toBe(false);
  });
});
