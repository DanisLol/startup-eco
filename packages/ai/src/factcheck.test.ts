import { describe, expect, it } from "vitest";
import { FactcheckResult, blockingIssues, isBlocking } from "./pipelines";

describe("factcheck blocking policy", () => {
  it("only safety issues block publishing", () => {
    expect(isBlocking({ severity: "safety", where: "s1", problem: "unsafe example" })).toBe(true);
    expect(isBlocking({ severity: "critical", where: "q1", problem: "wrong answer key" })).toBe(false);
    expect(isBlocking({ severity: "minor", where: "s1", problem: "imprecise wording" })).toBe(false);
  });

  it("blockingIssues returns only safety issues from a mixed report", () => {
    const fc = FactcheckResult.parse({
      ok: false,
      issues: [
        { severity: "safety", where: "s1", problem: "scary content" },
        { severity: "critical", where: "q1", problem: "wrong fact" },
        { severity: "minor", where: "s2", problem: "nitpick" },
      ],
    });
    const blocked = blockingIssues(fc);
    expect(blocked).toHaveLength(1);
    expect(blocked[0]!.severity).toBe("safety");
  });

  it("accepts the new three-severity enum", () => {
    const parsed = FactcheckResult.safeParse({
      ok: true,
      issues: [{ severity: "safety", where: "general", problem: "x" }],
    });
    expect(parsed.success).toBe(true);
  });
});
