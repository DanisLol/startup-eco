import { lessonPrompt } from "./prompts";
import { generationSchema } from "./schema";
import { generateObjectOnce } from "./generate";
import type { LessonArtifact } from "../types";

/**
 * Generates a 5-step lesson artifact and a short roadmap for the child's page.
 */
export async function generateLesson(input: {
  childName: string;
  age: number;
  topic: string;
}): Promise<{ artifact: LessonArtifact; roadmap: string[] }> {
  const output = await generateObjectOnce(
    generationSchema,
    lessonPrompt(input),
  );
  return {
    artifact: output.artifact,
    roadmap: output.roadmap,
  };
}
