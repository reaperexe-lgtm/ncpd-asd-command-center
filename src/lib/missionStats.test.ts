import { describe, expect, it } from "vitest";
import { countMissionsForUser } from "./missionStats";

describe("countMissionsForUser", () => {
  it("counts missions by protocol writer when present and falls back to creator for legacy rows", () => {
    const missions = [
      { id: "1", created_by: "user-a", protokollschreiber: "user-b", created_at: "2024-01-01T00:00:00.000Z" },
      { id: "2", created_by: "user-a", protokollschreiber: null, created_at: "2024-01-02T00:00:00.000Z" },
      { id: "3", created_by: "user-c", protokollschreiber: "user-a", created_at: "2024-01-03T00:00:00.000Z" },
      { id: "4", created_by: "user-d", protokollschreiber: "user-e", created_at: "2024-01-04T00:00:00.000Z" },
    ] as any[];

    expect(countMissionsForUser(missions, "user-a")).toBe(2);
    expect(countMissionsForUser(missions, "user-b")).toBe(1);
    expect(countMissionsForUser(missions, "user-e")).toBe(1);
  });
});
