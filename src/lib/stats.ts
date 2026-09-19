import type { LessonArtifact, LessonStats, Progress, Step } from "./types";

/**
 * Returns a short title for a step, used in the done screen and debrief.
 */
export function stepTitle(step: Step): string {
  if (step.type === "explain") return step.title;
  if (step.type === "quiz") return step.question;
  return step.prompt;
}

/**
 * Turns completed lesson steps into a parent-friendly explanation of the
 * activity. This is deterministic and grounded in the artifact content.
 */
export function describeActivity(input: {
  artifact: LessonArtifact;
  progress: Progress;
}): { description: string; learned: string[] } {
  const completed = input.artifact.steps.filter((step) => input.progress.completed.includes(step.id));
  if (completed.length === 0) {
    return { description: "Opened the lesson but did not complete an activity yet.", learned: [] };
  }

  const learned = completed.flatMap((step) => {
    if (step.type === "explain") return [step.paragraphs[0] ?? step.title];
    if (step.type === "quiz") return [step.explanation];
    return ["Practiced explaining the idea in their own words."];
  }).slice(0, 3);

  const kinds = new Set(completed.map((step) => step.type));
  const activityTypes = [
    kinds.has("explain") ? "learned through an explanation" : null,
    kinds.has("quiz") ? "practiced with a quiz" : null,
    kinds.has("reflect") ? "reflected in their own words" : null,
  ].filter(Boolean);

  return {
    description: `This activity ${activityTypes.join(" and ")}.`,
    learned,
  };
}

/**
 * Computes debrief stats from stored progress. Numbers are derived only here,
 * never by the model.
 */
export function computeStats(input: {
  childName: string;
  artifact: LessonArtifact;
  progress: Progress;
  startedAt: string;
  endedAt?: string;
}): LessonStats {
  const ended = input.endedAt ? new Date(input.endedAt) : new Date();
  const started = new Date(input.startedAt);
  const minutesElapsed = Math.max(
    1,
    Math.round((ended.getTime() - started.getTime()) / 60000),
  );

  const completedSet = new Set(input.progress.completed);
  const completedTitles = input.artifact.steps
    .filter((step) => completedSet.has(step.id))
    .map(stepTitle);

  const quizAnswers = Object.values(input.progress.answers);
  const quizzesAttempted = quizAnswers.length;
  const quizzesCorrect = quizAnswers.filter((answer) => answer.correct).length;

  return {
    childName: input.childName,
    lessonTitle: input.artifact.lessonTitle,
    stepsCompleted: input.progress.completed.length,
    stepsTotal: input.artifact.steps.length,
    quizzesCorrect,
    quizzesAttempted,
    minutesElapsed,
    completedTitles,
    reflection: input.progress.reflection.trim(),
    stoppedEarly:
      input.progress.completed.length < input.artifact.steps.length,
  };
}

const EMPTY_PROGRESS: Progress = {
  completed: [],
  answers: {},
  reflection: "",
};

/**
 * Returns a complete Progress object even if the stored JSON is partial.
 */
export function normalizeProgress(value: unknown): Progress {
  if (!value || typeof value !== "object") return { ...EMPTY_PROGRESS };
  const raw = value as Partial<Progress>;
  return {
    completed: Array.isArray(raw.completed)
      ? raw.completed.filter((id): id is string => typeof id === "string")
      : [],
    answers:
      raw.answers && typeof raw.answers === "object"
        ? Object.fromEntries(
            Object.entries(raw.answers).filter(
              ([, answer]) =>
                answer &&
                typeof answer.choice === "number" &&
                typeof answer.correct === "boolean",
            ),
          )
        : {},
    reflection: typeof raw.reflection === "string" ? raw.reflection : "",
  };
}

/**
 * Merges a step completion into the progress blob.
 */
export function mergeProgress(
  current: Progress,
  stepId: string,
  update?: {
    answer?: { choice: number; correct: boolean };
    reflection?: string;
  },
): Progress {
  const completed = current.completed.includes(stepId)
    ? current.completed
    : [...current.completed, stepId];

  return {
    completed,
    answers: update?.answer
      ? { ...current.answers, [stepId]: update.answer }
      : current.answers,
    reflection:
      typeof update?.reflection === "string"
        ? update.reflection
        : current.reflection,
  };
}
