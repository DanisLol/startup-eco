import type { Question, SubmittedAnswer } from "@eco/contracts";

export interface GradeResult {
  correct: boolean;
  /** Canonical form of what was submitted, for storage and reporting. */
  normalized: SubmittedAnswer;
}

/** Lower-case, trim, collapse whitespace, strip punctuation and articles. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Authoritative grading of a submitted answer against the blueprint question.
 * Pure and deterministic so the server and the in-artifact runtime agree.
 */
export function gradeAnswer(question: Question, answer: SubmittedAnswer): GradeResult {
  switch (question.kind) {
    case "mcq": {
      const id = typeof answer === "string" ? answer : "";
      return { correct: id === question.correctOptionId, normalized: id };
    }
    case "true_false": {
      const val = typeof answer === "boolean" ? answer : typeof answer === "string" ? answer === "true" : null;
      return { correct: val === question.answer, normalized: val ?? "" };
    }
    case "short_answer": {
      const text = typeof answer === "string" ? answer : "";
      const norm = normalizeText(text);
      const correct = norm.length > 0 && question.acceptedAnswers.some((a) => normalizeText(a) === norm);
      return { correct, normalized: text.trim() };
    }
    case "ordering": {
      const order = Array.isArray(answer) ? answer : [];
      const correct =
        order.length === question.correctOrder.length && order.every((id, i) => id === question.correctOrder[i]);
      return { correct, normalized: order };
    }
  }
}
