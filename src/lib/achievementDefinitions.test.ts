import { describe, expect, it } from "vitest";
import { MISSIONS_PARTICIPATION_ACHIEVEMENT_DEFS } from "./achievementDefinitions";

describe("MISSIONS_PARTICIPATION_ACHIEVEMENT_DEFS", () => {
  it("includes the new mission participation tiers with gambling rewards", () => {
    const codes = MISSIONS_PARTICIPATION_ACHIEVEMENT_DEFS.map((def) => def.code);
    expect(codes).toContain("missions_presence_10");
    expect(codes).toContain("missions_presence_1000");

    const first = MISSIONS_PARTICIPATION_ACHIEVEMENT_DEFS[0];
    expect(first.metric).toBe("crew_participations_total");
    expect(first.threshold).toBe(10);
    expect(first.reward_amount).toBe(100000);
  });
});
