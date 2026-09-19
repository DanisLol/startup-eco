import type { LessonStats } from "../types";
import { generateObjectOnce } from "./generate";
import { debriefPrompt } from "./prompts";
import { debriefSchema } from "./schema";

/**
 * Builds a fallback debrief from computed stats when the model is unavailable.
 */
export function templatedDebrief(stats: LessonStats): string {
  const quizLine =
    stats.quizzesAttempted === 0
      ? "They did not try a quiz yet."
      : stats.quizzesCorrect === stats.quizzesAttempted
        ? `They got every quiz question right (${stats.quizzesCorrect} of ${stats.quizzesAttempted}).`
        : `They got ${stats.quizzesCorrect} of ${stats.quizzesAttempted} quiz questions right.`;

  const stopLine = stats.stoppedEarly
    ? `They stopped after ${stats.stepsCompleted} of ${stats.stepsTotal} steps.`
    : `They finished all ${stats.stepsTotal} steps.`;

  const askAbout =
    stats.completedTitles[stats.completedTitles.length - 1] ??
    stats.lessonTitle;

  return `${stats.childName} spent ${stats.minutesElapsed} minutes on "${stats.lessonTitle}". ${stopLine} ${quizLine} Ask them about ${askAbout}.`;
}

/**
 * Writes a parent debrief SMS around already-computed stats.
 */
export async function writeDebrief(stats: LessonStats): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return templatedDebrief(stats);
  }

  try {
    const output = await generateObjectOnce(debriefSchema, debriefPrompt(stats));
    return output.message.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("debrief generation failed, using template", error);
    return templatedDebrief(stats);
  }
}
