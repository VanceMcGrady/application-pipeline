import { describe, expect, it } from "vitest";
import { checkGrounding, type LedgerAchievement } from "../src/grounding/checkGrounding.js";

const achievement: LedgerAchievement = {
  id: "a1",
  description: "Led a migration of the billing service to a new datastore.",
  metrics: [{ value: "40", unit: "%", label: "reduction in query latency" }],
  skills_tags: ["Postgres", "Go"],
};

describe("checkGrounding", () => {
  it("passes a bullet whose claims all trace back to its cited entry", () => {
    const result = checkGrounding(
      [{ achievement_ids: ["a1"], text: "Cut query latency 40% by migrating billing to Postgres." }],
      [achievement],
    );
    expect(result.status).toBe("passed");
    expect(result.notes).toHaveLength(0);
  });

  it("flags an invented metric not present in the cited entry", () => {
    const result = checkGrounding(
      [{ achievement_ids: ["a1"], text: "Cut query latency 90% by migrating billing to Postgres." }],
      [achievement],
    );
    expect(result.status).toBe("flagged");
    expect(result.notes[0]).toMatch(/90%/);
  });

  it("flags an invented technology not tagged on the cited entry", () => {
    const result = checkGrounding(
      [{ achievement_ids: ["a1"], text: "Migrated billing to Postgres using Kubernetes." }],
      [
        achievement,
        {
          id: "a2",
          description: "Rolled out container orchestration for the platform team.",
          metrics: [],
          skills_tags: ["Kubernetes"],
        },
      ],
    );
    expect(result.status).toBe("flagged");
    expect(result.notes[0]).toMatch(/Kubernetes/);
  });

  it("flags a bullet that cites no ledger entry at all", () => {
    const result = checkGrounding([{ achievement_ids: [], text: "Did great work." }], [achievement]);
    expect(result.status).toBe("flagged");
    expect(result.notes[0]).toMatch(/cites no ledger entry/);
  });

  it("flags a bullet that cites an unknown achievement id", () => {
    const result = checkGrounding(
      [{ achievement_ids: ["does-not-exist"], text: "Cut query latency 40%." }],
      [achievement],
    );
    expect(result.status).toBe("flagged");
    expect(result.notes[0]).toMatch(/unknown ledger entry/);
  });
});
