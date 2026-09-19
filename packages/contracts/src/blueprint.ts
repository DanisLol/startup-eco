import { z } from "zod";

/**
 * ArtifactBlueprint is the durable, validated description of a lesson.
 *
 * It is produced before any code is generated, holds every answer key and
 * piece of feedback, and is what the server grades against. It also drives
 * the fallback renderer when code generation or validation fails.
 */

export const LearningStage = z.enum([
  "discover",
  "understand",
  "recognize",
  "practice",
  "apply",
  "explain",
  "master",
]);
export type LearningStage = z.infer<typeof LearningStage>;

export const ObjectiveCode = z
  .string()
  .regex(/^lo[1-9]\d?$/, "objective codes look like lo1, lo2, ...");

export const LearningObjective = z.object({
  code: ObjectiveCode,
  text: z.string().min(5).max(200),
});
export type LearningObjective = z.infer<typeof LearningObjective>;

const Difficulty = z.number().int().min(1).max(3).describe("1 easy, 2 medium, 3 hard");

const QuestionBase = {
  id: z.string().min(1).max(40),
  prompt: z.string().min(3).max(400),
  explanation: z
    .string()
    .min(10)
    .max(500)
    .describe("Teaching feedback shown after answering; explains WHY, never just 'wrong'"),
  hint: z.string().max(300).optional(),
  difficulty: Difficulty,
  objectiveCodes: z.array(ObjectiveCode).min(1),
};

export const McqQuestion = z.object({
  kind: z.literal("mcq"),
  ...QuestionBase,
  options: z.array(z.object({ id: z.string().min(1).max(8), text: z.string().min(1).max(200) })).min(3).max(5),
  correctOptionId: z.string().min(1).max(8),
});

export const TrueFalseQuestion = z.object({
  kind: z.literal("true_false"),
  ...QuestionBase,
  answer: z.boolean(),
});

export const ShortAnswerQuestion = z.object({
  kind: z.literal("short_answer"),
  ...QuestionBase,
  acceptedAnswers: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(8)
    .describe("Case-insensitive accepted answers; include common spellings"),
});

export const OrderingQuestion = z.object({
  kind: z.literal("ordering"),
  ...QuestionBase,
  items: z.array(z.object({ id: z.string().min(1).max(8), text: z.string().min(1).max(120) })).min(3).max(7),
  correctOrder: z.array(z.string().min(1).max(8)).min(3).max(7),
});

export const Question = z.discriminatedUnion("kind", [
  McqQuestion,
  TrueFalseQuestion,
  ShortAnswerQuestion,
  OrderingQuestion,
]);
export type Question = z.infer<typeof Question>;
export type QuestionKind = Question["kind"];

const SectionBase = {
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  stage: LearningStage,
};

export const IntroSection = z.object({
  type: z.literal("intro"),
  ...SectionBase,
  body: z.string().min(12).max(220),
  hook: z.string().min(5).max(140).describe("A curiosity question or surprising fact"),
});

export const VisualKind = z.enum(["comparison", "sequence", "parts", "timeline", "orbit", "simulation"]);
export type VisualKind = z.infer<typeof VisualKind>;

export const VisualItem = z.object({
  id: z.string().min(1).max(40).optional(),
  label: z.string().min(1).max(60),
  description: z.string().min(1).max(240),
  value: z.number().optional().describe("Optional magnitude for comparisons (e.g. size, distance)"),
  emoji: z.string().max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Hex colour for this body or part, used by orbit/comparison visuals"),
});
export type VisualItem = z.infer<typeof VisualItem>;

export const VisualSpec = z.object({
  kind: VisualKind,
  caption: z.string().max(200),
  items: z.array(VisualItem).min(2).max(12),
});
export type VisualSpec = z.infer<typeof VisualSpec>;

export const ExplainSection = z.object({
  type: z.literal("explain"),
  ...SectionBase,
  paragraphs: z.array(z.string().min(10).max(280)).min(1).max(2),
  analogy: z
    .string()
    .max(240)
    .optional()
    .describe("Optional analogy bridging to the child's interests; never requires copyrighted characters"),
  visual: VisualSpec.optional(),
});

export const ExploreSection = z.object({
  type: z.literal("explore"),
  ...SectionBase,
  lead: z.string().min(8).max(180).describe("One short sentence. The visual does the teaching."),
  prompt: z.string().min(5).max(140).describe("What the child should do, e.g. 'Tap a planet'"),
  visual: VisualSpec,
});

export const QuizSection = z.object({
  type: z.literal("quiz"),
  ...SectionBase,
  intro: z.string().max(300).optional(),
  questions: z.array(Question).min(2).max(12),
});

export const ApplySection = z.object({
  type: z.literal("apply"),
  ...SectionBase,
  scenario: z.string().min(20).max(600).describe("A new situation where the concept must be used"),
  questions: z.array(Question).min(1).max(4),
});

export const ReviewSection = z.object({
  type: z.literal("review"),
  ...SectionBase,
  bullets: z.array(z.string().min(5).max(200)).min(2).max(8),
  nextStep: z.string().max(200).optional(),
});

export const Section = z.discriminatedUnion("type", [
  IntroSection,
  ExploreSection,
  ExplainSection,
  QuizSection,
  ApplySection,
  ReviewSection,
]);
export type Section = z.infer<typeof Section>;

export const Theme = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  mood: z.string().max(60).describe("e.g. 'cosmic and calm', 'sunny meadow'"),
  emoji: z.string().max(8),
});

export const ArtifactBlueprint = z.object({
  schemaVersion: z.literal(1),
  topicSlug: z.string(),
  title: z.string().min(2).max(80),
  audience: z.object({
    age: z.number().int().min(3).max(18).nullable(),
    readingLevel: z.enum(["pre_reader", "early", "developing", "fluent", "advanced"]).nullable(),
  }),
  theme: Theme,
  learningObjectives: z.array(LearningObjective).min(2).max(6),
  stages: z.array(LearningStage).min(2),
  personalization: z
    .string()
    .max(400)
    .optional()
    .describe("How parent-provided interests were used as a teaching bridge"),
  sections: z.array(Section).min(3).max(12),
});
export type ArtifactBlueprint = z.infer<typeof ArtifactBlueprint>;

/** Every question in a blueprint, flattened with its containing section id. */
export function collectQuestions(bp: ArtifactBlueprint): Array<{ sectionId: string; question: Question }> {
  const out: Array<{ sectionId: string; question: Question }> = [];
  for (const s of bp.sections) {
    if (s.type === "quiz" || s.type === "apply") {
      for (const q of s.questions) out.push({ sectionId: s.id, question: q });
    }
  }
  return out;
}

/** Structural checks that Zod alone cannot express. Returns human-readable problems. */
export function lintBlueprint(bp: ArtifactBlueprint): string[] {
  const problems: string[] = [];
  const objectiveCodes = new Set(bp.learningObjectives.map((o) => o.code));
  const sectionIds = new Set<string>();
  const questionIds = new Set<string>();

  for (const s of bp.sections) {
    if (sectionIds.has(s.id)) problems.push(`duplicate section id "${s.id}"`);
    sectionIds.add(s.id);
  }

  for (const { sectionId, question: q } of collectQuestions(bp)) {
    if (questionIds.has(q.id)) problems.push(`duplicate question id "${q.id}"`);
    questionIds.add(q.id);
    for (const code of q.objectiveCodes) {
      if (!objectiveCodes.has(code)) problems.push(`question "${q.id}" references unknown objective ${code}`);
    }
    if (q.kind === "mcq") {
      const ids = q.options.map((o) => o.id);
      if (new Set(ids).size !== ids.length) problems.push(`question "${q.id}" has duplicate option ids`);
      if (!ids.includes(q.correctOptionId)) problems.push(`question "${q.id}" correctOptionId not among options`);
    }
    if (q.kind === "ordering") {
      const ids = q.items.map((i) => i.id).sort();
      const order = [...q.correctOrder].sort();
      if (ids.join("|") !== order.join("|")) problems.push(`question "${q.id}" correctOrder must be a permutation of items`);
    }
    if (q.kind === "short_answer" && q.acceptedAnswers.some((a) => a.trim().length === 0)) {
      problems.push(`question "${q.id}" has an empty accepted answer`);
    }
    void sectionId;
  }

  for (const s of bp.sections) {
    if (s.type === "explore") {
      const ids = s.visual.items.map((it) => it.id || it.label);
      if (new Set(ids).size !== ids.length) problems.push(`explore "${s.id}" has duplicate item ids/labels`);
      if (s.visual.kind === "orbit" && s.visual.items.length < 3) {
        problems.push(`explore "${s.id}" orbit visual needs at least 3 items (a centre plus two bodies)`);
      }
    }
  }

  const hasIntro = bp.sections.some((s) => s.type === "intro");
  const hasExplore = bp.sections.some((s) => s.type === "explore");
  const hasQuiz = bp.sections.some((s) => s.type === "quiz");
  const hasReview = bp.sections.some((s) => s.type === "review");
  if (!hasIntro) problems.push("missing intro section");
  if (!hasExplore) problems.push("missing explore section (interactive visual is the lesson)");
  if (!hasReview) problems.push("missing review section");
  if (!hasQuiz) problems.push("missing quiz section");
  if (bp.sections[0]?.type !== "intro") problems.push("first section must be intro");
  if (bp.sections[bp.sections.length - 1]?.type !== "quiz") problems.push("last section must be the quiz");
  const quizIdx = bp.sections.findIndex((s) => s.type === "quiz");
  const reviewIdx = bp.sections.findIndex((s) => s.type === "review");
  if (reviewIdx >= 0 && quizIdx >= 0 && reviewIdx > quizIdx) problems.push("review must come before the quiz");

  const covered = new Set<string>();
  for (const { question } of collectQuestions(bp)) question.objectiveCodes.forEach((c) => covered.add(c));
  for (const code of objectiveCodes) {
    if (!covered.has(code)) problems.push(`objective ${code} is never assessed`);
  }

  return problems;
}

/**
 * Parse a stored or model-produced blueprint. Strips legacy flashcard
 * sections so older artifacts still load after that type was removed.
 */
export function parseBlueprint(data: unknown): ArtifactBlueprint {
  if (data && typeof data === "object" && "sections" in data && Array.isArray((data as { sections: unknown }).sections)) {
    const raw = data as { sections: Array<{ type?: string }> };
    return ArtifactBlueprint.parse({
      ...raw,
      sections: raw.sections.filter((s) => s && s.type !== "flashcards"),
    });
  }
  return ArtifactBlueprint.parse(data);
}
