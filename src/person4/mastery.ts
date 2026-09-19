import type { MasteryEstimate, MasteryLevel, TopicProgressState } from './types.js';
import { computeProgressSignals } from './progress.js';

/**
 * Mastery estimation (spec §22).
 *
 * A single quiz score never decides mastery. The estimate blends accuracy,
 * first-attempt success, independence (no hints/reveals), recent performance,
 * activity variety, objective coverage, and — when available — delayed recall
 * from review sessions. Thin evidence is capped until enough graded attempts
 * exist, so ten memorized answers do not produce a "master".
 */

export interface MasteryOptions {
  /**
   * Accuracy on review questions answered after a delay (e.g. a spaced review
   * session days later). Evidence of retention; can raise confidence.
   */
  delayedRecallAccuracy?: number;
  /** Difficulty mix is known from attempts; override for testing. */
  now?: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const WEIGHTS = {
  accuracy: 0.25,
  firstAttemptAccuracy: 0.2,
  independence: 0.15,
  recentAccuracy: 0.2,
  activityVariety: 0.1,
  objectiveCoverage: 0.1,
} as const;

/** Graded attempts required before 'proficient'/'mastered' are reachable. */
export const MIN_EVIDENCE_FOR_MASTERY = 5;

function levelFor(confidence: number): MasteryLevel {
  if (confidence < 0.35) return 'novice';
  if (confidence < 0.6) return 'developing';
  if (confidence < 0.8) return 'proficient';
  return 'mastered';
}

export function estimateMastery(
  state: TopicProgressState,
  options: MasteryOptions = {},
): MasteryEstimate {
  const signals = computeProgressSignals(state);
  const gradedCount = state.attempts.length;
  const reasons: string[] = [];

  const variety = Math.min(1, signals.activityVariety / 3);
  let confidence =
    WEIGHTS.accuracy * signals.accuracy +
    WEIGHTS.firstAttemptAccuracy * signals.firstAttemptAccuracy +
    WEIGHTS.independence * signals.independence +
    WEIGHTS.recentAccuracy * signals.recentAccuracy +
    WEIGHTS.activityVariety * variety +
    WEIGHTS.objectiveCoverage * signals.objectiveCoverage;

  if (signals.accuracy > 0) reasons.push(`overall accuracy ${Math.round(signals.accuracy * 100)}%`);
  if (signals.firstAttemptAccuracy > 0) {
    reasons.push(`first-attempt accuracy ${Math.round(signals.firstAttemptAccuracy * 100)}%`);
  }
  if (signals.independence > 0) reasons.push(`independence ${Math.round(signals.independence * 100)}%`);

  // Delayed recall (§22: performance after a delay) nudges confidence up or down.
  if (typeof options.delayedRecallAccuracy === 'number') {
    const recall = Math.max(0, Math.min(1, options.delayedRecallAccuracy));
    const delta = (recall - 0.7) * 0.2; // ±0.06 around a 70% expectation
    confidence += delta;
    reasons.push(
      recall >= 0.7
        ? `delayed recall ${Math.round(recall * 100)}% supports retention`
        : `delayed recall ${Math.round(recall * 100)}% suggests review needed`,
    );
  }

  // Evidence gate: thin data cannot claim high mastery.
  if (gradedCount < MIN_EVIDENCE_FOR_MASTERY) {
    confidence = Math.min(confidence, 0.55);
    reasons.push(`only ${gradedCount} graded attempt(s); mastery capped until more evidence`);
  }

  // Variety gate: one activity type is weak evidence of transfer (§22).
  if (signals.activityVariety < 2 && gradedCount >= MIN_EVIDENCE_FOR_MASTERY) {
    confidence = Math.min(confidence, 0.75);
    reasons.push('performance shown in only one activity type');
  }

  // All-easy gate: mastery should include some challenge.
  const difficulties = state.attempts.map((a) => a.difficulty).filter((d) => d !== null);
  if (difficulties.length > 0 && difficulties.every((d) => d === 'easy')) {
    confidence = Math.min(confidence, 0.75);
    reasons.push('all questions were easy difficulty');
  }

  confidence = round2(Math.max(0, Math.min(1, confidence)));
  const level = levelFor(confidence);

  return {
    topicId: state.topicId,
    level,
    confidence,
    reasons,
  };
}
