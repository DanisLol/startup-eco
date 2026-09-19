/**
 * Prompt for extracting a child's name, age, and topic from a parent's SMS.
 */
export function parentExtractPrompt(body: string): string {
  return `Extract the child's first name, age, and what they should learn from this parent text message.

Rules:
- childName: first name only. If missing, use "your child".
- age: integer. If missing, use 8.
- topic: a short learning topic, not the whole sentence. If unclear, use the whole message.

Parent text:
${body}`;
}

/**
 * Prompt for generating one playable lesson plus a short roadmap.
 */
export function lessonPrompt(input: {
  childName: string;
  age: number;
  topic: string;
}): string {
  return `Write one playable lesson for a child.

Child: ${input.childName}, age ${input.age}
Topic: ${input.topic}

Reading level: short sentences. Words a ${input.age}-year-old knows. No jargon unless you explain it in the next sentence. No emoji. No markdown.

Return:
- roadmap: 3 or 4 lesson titles. Lesson 1 is the one you write now. The rest are "coming next".
- artifact.lessonTitle: the title of lesson 1
- artifact.steps: exactly 5 steps in this order:
  1. explain
  2. quiz (exactly 4 short choices, one clearly correct)
  3. explain
  4. quiz (exactly 4 short choices, one clearly correct)
  5. reflect (one prompt the child can answer in a sentence)
- artifact.wrapUp: 2-3 sentences celebrating what they learned

Step ids: explain-1, quiz-1, explain-2, quiz-2, reflect-1.
Quizzes must have a correctIndex of 0-3 matching the right choice.
Keep each paragraph under 25 words.`;
}

/**
 * Prompt for a parent debrief SMS. The model must not invent or recompute numbers.
 */
export function debriefPrompt(stats: {
  childName: string;
  lessonTitle: string;
  stepsCompleted: number;
  stepsTotal: number;
  quizzesCorrect: number;
  quizzesAttempted: number;
  minutesElapsed: number;
  completedTitles: string[];
  reflection: string;
  stoppedEarly: boolean;
}): string {
  return `Write one SMS to a parent about a lesson their child just finished.

Use ONLY these facts. Do not change any number. Do not add facts that are not here.

Child name: ${stats.childName}
Lesson title: ${stats.lessonTitle}
Minutes spent: ${stats.minutesElapsed}
Steps finished: ${stats.stepsCompleted} of ${stats.stepsTotal}
Quiz score: ${stats.quizzesCorrect} of ${stats.quizzesAttempted} (if attempted is 0, say they did not try a quiz yet)
Completed step titles: ${stats.completedTitles.join("; ") || "none"}
Stopped early: ${stats.stoppedEarly ? "yes" : "no"}
Child's reflection: ${stats.reflection || "none"}

Rules:
- Three SMS segments or fewer (under 480 characters)
- No markdown, no emoji, no bullet points
- Plain sentences
- End with one specific thing the parent can say or ask, tied to what the child actually did
- If they stopped early, mention that gently
- If they wrote a reflection, refer to it without quoting it at length

Example shape, not the answer:
Mia spent 9 minutes on "Why Volcanoes Erupt" and finished 4 of 5 steps. She got both quiz questions right. She stopped before the last reflection question. Ask her what makes lava move.`;
}
