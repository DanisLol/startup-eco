import { z } from "zod";

/**
 * Curriculum shapes. `GeneratedCurriculum` is what the model returns;
 * the database rows add ids, ownership and status on top.
 */

export const TopicSlug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

export const GeneratedTopic = z.object({
  slug: TopicSlug.describe("Stable kebab-case identifier unique within the curriculum"),
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(400),
  difficulty: z.number().int().min(1).max(5).describe("1 = easiest, 5 = hardest"),
  prerequisites: z
    .array(TopicSlug)
    .default([])
    .describe("Slugs of topics in this curriculum that should be completed first"),
  learningObjectives: z
    .array(z.string().min(5).max(200))
    .min(2)
    .max(6)
    .describe("Observable outcomes; start with a verb (Identify, Explain, Compare...)"),
});
export type GeneratedTopic = z.infer<typeof GeneratedTopic>;

export const GeneratedCurriculum = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(400),
  topics: z.array(GeneratedTopic).min(3).max(20),
});
export type GeneratedCurriculum = z.infer<typeof GeneratedCurriculum>;

export const TopicStatus = z.enum(["locked", "not_started", "in_progress", "needs_review", "completed"]);
export type TopicStatus = z.infer<typeof TopicStatus>;

export const CurriculumStatus = z.enum(["generating", "ready", "failed"]);
export type CurriculumStatus = z.infer<typeof CurriculumStatus>;
