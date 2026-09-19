import { z } from "zod";

export const parentTextSchema = z.object({
  childName: z.string().min(1).max(40),
  age: z.number().int().min(3).max(14),
  topic: z.string().min(1).max(120),
});

export const stepSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("explain"),
    title: z.string(),
    paragraphs: z.array(z.string()).min(1).max(4),
  }),
  z.object({
    id: z.string(),
    type: z.literal("quiz"),
    question: z.string(),
    choices: z.array(z.string()).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("reflect"),
    prompt: z.string(),
  }),
]);

export const lessonArtifactSchema = z.object({
  lessonTitle: z.string(),
  steps: z.array(stepSchema).min(4).max(6),
  wrapUp: z.string(),
});

export const generationSchema = z.object({
  roadmap: z.array(z.string()).min(3).max(4),
  artifact: lessonArtifactSchema,
});

export const debriefSchema = z.object({
  message: z.string().min(20).max(480),
});
