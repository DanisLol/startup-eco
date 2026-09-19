import type { ArtifactBlueprint, GeneratedCurriculum, LearnerContext } from "@eco/contracts";
import { SOLAR_SYSTEM_BLUEPRINTS, SOLAR_SYSTEM_CURRICULUM } from "./solarSystem";

/**
 * Deterministic generators used when no model is configured. Solar-system
 * goals get hand-checked content; anything else gets a structurally complete
 * placeholder lesson that is clearly labelled as demo content.
 */

function subjectFromGoal(goal: string): string {
  const cleaned = goal
    .replace(/^i\s+(want|would like|'d like)\s+(my\s+\w+\s+)?to\s+(learn|understand|know)\s+(about\s+)?/i, "")
    .replace(/^(teach|help)\s+(my\s+\w+\s+)?(learn|understand|about)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
  const s = cleaned.length > 0 ? cleaned : goal.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "topic";
}

export function mockCurriculum(goal: string, _learner: LearnerContext): GeneratedCurriculum {
  if (/solar system|planets/i.test(goal)) return SOLAR_SYSTEM_CURRICULUM;
  const subject = subjectFromGoal(goal);
  const base = slugify(subject);
  const t = (suffix: string, title: string, description: string, difficulty: number, prereq: string[], objectives: string[]) => ({
    slug: `${base}-${suffix}`,
    title,
    description,
    difficulty,
    prerequisites: prereq.map((p) => `${base}-${p}`),
    learningObjectives: objectives,
  });
  return {
    title: subject,
    description: `An introduction to ${subject.toLowerCase()}: the big idea, the key parts, how it works, and how it shows up in everyday life.`,
    topics: [
      t("intro", `What is ${subject}?`, `The big picture and why it matters.`, 1, [], [`Describe ${subject.toLowerCase()} in one sentence`, `Identify one place ${subject.toLowerCase()} shows up in everyday life`, `Recognize two key words about ${subject.toLowerCase()}`]),
      t("parts", `The parts of ${subject}`, `The main pieces and what each one does.`, 2, ["intro"], [`Name the main parts of ${subject.toLowerCase()}`, `Describe what each part does`, `Explain how the parts fit together`]),
      t("how-it-works", `How ${subject} works`, `Step by step, cause and effect.`, 3, ["parts"], [`Order the steps in how ${subject.toLowerCase()} works`, `Explain what happens if one step is missing`, `Predict the result of a change`]),
      t("everyday", `${subject} around us`, `Spotting it in daily life and using the idea.`, 3, ["how-it-works"], [`Identify examples of ${subject.toLowerCase()} in daily life`, `Apply the idea to a new situation`]),
      t("review", `${subject} review`, `Bring it all together.`, 3, ["everyday"], [`Summarize the big ideas of ${subject.toLowerCase()}`, `Explain ${subject.toLowerCase()} in your own words`]),
    ],
  };
}

const PALETTES = [
  { primary: "#4f46e5", accent: "#f59e0b", background: "#fafaf9", mood: "bright and curious", emoji: "✨" },
  { primary: "#0f766e", accent: "#f97316", background: "#f0fdfa", mood: "fresh and green", emoji: "🌱" },
  { primary: "#be185d", accent: "#eab308", background: "#fdf2f8", mood: "playful", emoji: "🎈" },
  { primary: "#1d4ed8", accent: "#22c55e", background: "#eff6ff", mood: "clear sky", emoji: "🧭" },
];

export function mockBlueprint(input: {
  topic: { slug: string; title: string; description: string; objectives: string[] };
  learner: LearnerContext;
}): ArtifactBlueprint {
  const seeded = SOLAR_SYSTEM_BLUEPRINTS[input.topic.slug];
  if (seeded) {
    return {
      ...seeded,
      audience: { age: input.learner.age, readingLevel: input.learner.readingLevel },
      personalization: input.learner.interests.length
        ? `Demo content: interests (${input.learner.interests.join(", ")}) would shape analogies and scenarios when a model is configured.`
        : seeded.personalization,
    };
  }

  const { topic, learner } = input;
  const objectives = topic.objectives.slice(0, 6).map((text, i) => ({ code: `lo${i + 1}`, text }));
  const palette = PALETTES[Math.abs(hash(topic.slug)) % PALETTES.length]!;
  const codes = objectives.map((o) => o.code);

  return {
    schemaVersion: 1,
    topicSlug: topic.slug,
    title: topic.title,
    audience: { age: learner.age, readingLevel: learner.readingLevel },
    theme: palette,
    learningObjectives: objectives,
    stages: ["discover", "understand", "recognize", "practice"],
    personalization: "Demo lesson generated without an AI model. Configure GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY for real content.",
    sections: [
      {
        type: "intro", id: "intro", title: topic.title, stage: "discover",
        body: topic.description.slice(0, 200) || `Let's explore ${topic.title.toLowerCase()}.`,
        hook: `What do you already know about ${topic.title.toLowerCase()}?`,
      },
      {
        type: "explore", id: "explore", title: "Explore the idea", stage: "discover",
        lead: "Tap each goal. This is what you will be able to do by the end.",
        prompt: "Tap a goal",
        visual: {
          kind: "parts", caption: "Learning goals",
          items: objectives.map((o, i) => ({
            id: o.code,
            label: `Goal ${i + 1}`,
            description: o.text,
            emoji: ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"][i],
          })),
        },
      },
      {
        type: "review", id: "review", title: "What we will practise", stage: "understand",
        bullets: objectives.map((o) => o.text).slice(0, 8),
        nextStep: "Ready for a quick quiz?",
      },
      {
        type: "quiz", id: "quiz", title: "Quick check", stage: "practice",
        intro: "These demo questions check that you read the goals carefully.",
        questions: [
          {
            kind: "mcq", id: "q1", prompt: `Which of these is a goal of the lesson "${topic.title}"?`, difficulty: 1, objectiveCodes: [codes[0]!],
            options: [
              { id: "a", text: objectives[0]!.text },
              { id: "b", text: "Memorize a list of unrelated dates" },
              { id: "c", text: "Learn to juggle three balls" },
            ],
            correctOptionId: "a", hint: "Look back at Goal 1.",
            explanation: `"${objectives[0]!.text}" is the first goal of this lesson. The other options are not part of it.`,
          },
          {
            kind: "true_false", id: "q2", prompt: `This lesson is about ${topic.title.toLowerCase()}.`, answer: true, difficulty: 1, objectiveCodes: codes,
            explanation: `Yes, every activity here is about ${topic.title.toLowerCase()}, and each goal builds on the last.`,
          },
          {
            kind: "short_answer", id: "q3", prompt: "Type the name of this lesson's topic.", acceptedAnswers: [topic.title], difficulty: 1, objectiveCodes: [codes[codes.length - 1]!],
            hint: "It is in the big title at the top.",
            explanation: `The topic is "${topic.title}". Naming what you are learning is the first step to remembering it.`,
          },
        ],
      },
    ],
  };
}

export function mockFactcheck(): { ok: true; issues: [] } {
  return { ok: true, issues: [] };
}

export function mockReport(childName: string, stats: Record<string, unknown>): string {
  const s = stats as {
    topicsOpened?: string[];
    topicsCompleted?: string[];
    needsReview?: string[];
    questionsAnswered?: number;
    questionsCorrect?: number;
    minutesActive?: number;
  };
  if (!s.topicsOpened?.length) {
    return `${childName} did not open any lessons today. Observed: no learning activity recorded. Suggestion: pick one short topic together tomorrow and let ${childName} start it independently.`;
  }
  const acc =
    s.questionsAnswered && s.questionsAnswered > 0
      ? `${childName} answered ${s.questionsCorrect ?? 0} of ${s.questionsAnswered} questions correctly.`
      : `No questions were answered yet.`;
  const completed = s.topicsCompleted?.length ? `Completed: ${s.topicsCompleted.join(", ")}.` : `No topics were fully completed.`;
  const review = s.needsReview?.length ? `Needs review: ${s.needsReview.join(", ")}.` : "";
  return `Observed today: ${childName} opened ${s.topicsOpened.length} topic${s.topicsOpened.length === 1 ? "" : "s"} (${s.topicsOpened.join(", ")}) and was active for about ${s.minutesActive ?? 0} minutes. ${completed} ${acc} ${review} Recommendation: ${
    s.needsReview?.length ? `spend five minutes revisiting ${s.needsReview[0]} before moving on.` : `continue with the next topic in the sequence.`
  }`.replace(/\s+/g, " ").trim();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
