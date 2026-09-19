import { describe, expect, it } from "vitest";
import { fixtureArtifact } from "../src/lib/fixture";
import { computeStats, describeActivity, normalizeProgress } from "../src/lib/stats";

describe("parent dashboard progress data", () => {
  it("derives factual progress from the stored session blob", () => {
    const stats = computeStats({
      childName: "Mia",
      artifact: fixtureArtifact,
      progress: {
        completed: ["explain-1", "quiz-1"],
        answers: { "quiz-1": { choice: 1, correct: true } },
        reflection: "The lava was cool.",
      },
      startedAt: "2026-01-01T10:00:00.000Z",
      endedAt: "2026-01-01T10:08:00.000Z",
    });

    expect(stats.childName).toBe("Mia");
    expect(stats.stepsCompleted).toBe(2);
    expect(stats.stepsTotal).toBe(5);
    expect(stats.quizzesCorrect).toBe(1);
    expect(stats.quizzesAttempted).toBe(1);
    expect(stats.stoppedEarly).toBe(true);
    expect(stats.reflection).toBe("The lava was cool.");
  });

  it("does not trust malformed progress JSON", () => {
    const progress = normalizeProgress({
      completed: ["quiz-1", 4, null],
      answers: {
        "quiz-1": { choice: 1, correct: true },
        broken: { choice: "one", correct: true },
      },
      reflection: 42,
    });

    expect(progress.completed).toEqual(["quiz-1"]);
    expect(progress.answers).toEqual({ "quiz-1": { choice: 1, correct: true } });
    expect(progress.reflection).toBe("");
  });

  it("explains what a completed activity taught", () => {
    const activity = describeActivity({
      artifact: fixtureArtifact,
      progress: { completed: ["explain-1", "quiz-1"], answers: { "quiz-1": { choice: 1, correct: true } }, reflection: "" },
    });
    expect(activity.description).toContain("learned through an explanation");
    expect(activity.description).toContain("practiced with a quiz");
    expect(activity.learned).toContain("A volcano is a mountain with a hot surprise inside.");
  });

  it("keeps completed sessions separate from review candidates", () => {
    const completed = computeStats({
      childName: "Mia",
      artifact: fixtureArtifact,
      progress: {
        completed: fixtureArtifact.steps.map((step) => step.id),
        answers: {
          "quiz-1": { choice: 1, correct: true },
          "quiz-2": { choice: 2, correct: true },
        },
        reflection: "",
      },
      startedAt: "2026-01-01T10:00:00.000Z",
      endedAt: "2026-01-01T10:20:00.000Z",
    });

    expect(completed.stoppedEarly).toBe(false);
    expect(completed.quizzesCorrect).toBe(2);
    expect(completed.quizzesAttempted).toBe(2);
  });
});
