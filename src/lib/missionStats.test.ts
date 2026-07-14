import { describe, expect, it } from "vitest";
import { countCrewParticipationsForUser, countHeliTeilnehmerForUser, countMissionsForUser } from "./missionStats";

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

  it("counts helicopter crew participations for the matching crew role", () => {
    const missions = [
      { pilot: "Alice", co_pilot: null, left_gunner: null, right_gunner: null },
      { pilot: null, co_pilot: "Alice", left_gunner: null, right_gunner: null },
      { pilot: null, co_pilot: null, left_gunner: "Bob", right_gunner: null },
      { pilot: null, co_pilot: null, left_gunner: null, right_gunner: "Alice" },
    ] as any[];

    expect(countCrewParticipationsForUser(missions, "Alice")).toBe(3);
    expect(countCrewParticipationsForUser(missions, "Bob")).toBe(1);
  });
});

describe("countHeliTeilnehmerForUser", () => {
  it("counts co-pilot/gunner roles but not pilot", () => {
    const entries = [
      { pilot: "Alice", co_pilot: null, left_gunner: null, right_gunner: null },
      { pilot: null, co_pilot: "Alice", left_gunner: null, right_gunner: null },
      { pilot: null, co_pilot: null, left_gunner: "Alice", right_gunner: null },
      { pilot: null, co_pilot: null, left_gunner: null, right_gunner: "Alice" },
    ] as any[];

    // Pilot-Eintrag (Zeile 1) zählt nicht, die drei Crew-Einträge schon.
    expect(countHeliTeilnehmerForUser(entries, "Alice")).toBe(3);
  });

  it("does not count an entry where the user is also the protocol writer", () => {
    const entries = [
      { co_pilot: "Alice", left_gunner: null, right_gunner: null, protokollschreiber: "user-a", created_by: "user-x" },
      { co_pilot: "Alice", left_gunner: null, right_gunner: null, protokollschreiber: null, created_by: "user-a" },
      { co_pilot: "Alice", left_gunner: null, right_gunner: null, protokollschreiber: "user-b", created_by: "user-b" },
    ] as any[];

    // Erste zwei Zeilen: Alice (user-a) ist selbst Schreiber -> zählt nicht.
    // Dritte Zeile: jemand anders (user-b) ist Schreiber -> zählt.
    expect(countHeliTeilnehmerForUser(entries, "Alice", "user-a")).toBe(1);
  });

  it("falls back to counting everything if no userId is given", () => {
    const entries = [
      { co_pilot: "Alice", left_gunner: null, right_gunner: null, protokollschreiber: "user-a", created_by: "user-a" },
    ] as any[];

    expect(countHeliTeilnehmerForUser(entries, "Alice")).toBe(1);
  });

  it("excludes writer via resolved profile name (Statistik parity, case/diacritics insensitive)", () => {
    const entries = [
      // Writer id differs from user id, but the writer's resolved name matches the crew name
      { co_pilot: "Álice", left_gunner: null, right_gunner: null, protokollschreiber: "user-writer", created_by: "user-x" },
      // Different writer name -> zählt
      { co_pilot: "Alice", left_gunner: null, right_gunner: null, protokollschreiber: "user-writer2", created_by: "user-x" },
    ] as any[];

    const lookup = new Map<string, string>([
      ["user-writer", "alice"], // matches "Alice" normalized
      ["user-writer2", "Bob"],
    ]);

    // Ohne userId, aber mit Name-Lookup: erste Zeile ausgeschlossen, zweite zählt.
    expect(countHeliTeilnehmerForUser(entries, "Alice", null, lookup)).toBe(1);
  });


  it("counts only co-pilot, left gunner, and right gunner roles", () => {
    const entries = [
      { pilot: "Alice", co_pilot: null, left_gunner: null, right_gunner: null },
      { pilot: null, co_pilot: "Alice", left_gunner: null, right_gunner: null },
      { pilot: null, co_pilot: null, left_gunner: "Alice", right_gunner: null },
      { pilot: null, co_pilot: null, left_gunner: null, right_gunner: "Alice" },
    ] as any[];

    expect(countHeliTeilnehmerForUser(entries, "Alice")).toBe(3);
  });
});
