import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { parentExtractPrompt } from "./prompts";
import { parentTextSchema } from "./schema";

const MODEL_ID = "gemini-3.5-flash-lite";

/**
 * Runs a structured generation once, then once more if the first call fails.
 */
export async function generateObjectOnce<T>(
  schema: z.ZodType<T>,
  prompt: string,
): Promise<T> {
  const run = async (): Promise<T> => {
    const result = await generateText({
      model: google(MODEL_ID),
      output: Output.object({ schema }),
      prompt,
    });
    if (result.output == null) {
      throw new Error("Model returned no structured output");
    }
    return result.output as T;
  };

  try {
    return await run();
  } catch (firstError) {
    console.error("structured generate failed, retrying once", firstError);
    return await run();
  }
}

/**
 * Pulls a likely first name and age out of a parent text without calling a model.
 */
function heuristicExtract(body: string): {
  childName: string;
  age: number;
  topic: string;
} {
  const nameMatch = body.match(/\b([A-Z][a-z]+)\b/);
  const ageMatch = body.match(/\b([3-9]|1[0-4])\b/);
  return {
    childName: nameMatch?.[1] ?? "your child",
    age: ageMatch ? Number(ageMatch[1]) : 8,
    topic: body.trim() || "something new",
  };
}

/**
 * Extracts name, age, and topic from a parent SMS. Never throws; uses defaults.
 */
export async function extractParentText(body: string): Promise<{
  childName: string;
  age: number;
  topic: string;
}> {
  const fallback = heuristicExtract(body);

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return fallback;
  }

  try {
    const parsed = await generateObjectOnce(
      parentTextSchema,
      parentExtractPrompt(body),
    );
    return {
      childName: parsed.childName.trim() || fallback.childName,
      age: parsed.age || fallback.age,
      topic: parsed.topic.trim() || fallback.topic,
    };
  } catch (error) {
    console.error("parent extract failed, using defaults", error);
    return fallback;
  }
}
