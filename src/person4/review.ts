import type {
  ReviewItem,
  ReviewPriority,
  SpacedReviewSchedule,
  TopicProgressState,
} from './types.js';

/**
 * Spaced review scheduling (spec §10).
 *
 * Revisits concepts that appear forgotten or under-practiced: failed or
 * hinted answers, stale topics, low mastery, and explicitly flagged
 * needs_review topics. Mastered topics are skipped unless they have gone
 * stale. Review is adaptive — the child who demonstrates mastery is not
 * forced to repeat.
 */

export interface ReviewSchedulerOptions {
  /** Items not touched within this window become review candidates (ms). */
  staleAfterMs?: number;
  /** Reference "now" for determinism in tests; defaults to Date.now(). */
  now?: number;
  /** Cap on items returned; keep daily review short (§10). */
  maxItems?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STALE_AFTER_MS = 7 * DAY_MS;

function isStale(lastActivityAt: number | null, staleAfterMs: number, now: number): boolean {
  if (lastActivityAt === null) return true;
  return now - lastActivityAt > staleAfterMs;
}

/**
 * Builds a daily review list from progress states. Deterministic: items with
 * equal priority keep their input order.
 */
export function buildSpacedReviewSchedule(
  states: readonly TopicProgressState[],
  options: ReviewSchedulerOptions = {},
): SpacedReviewSchedule {
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const now = options.now ?? Date.now();
  const maxItems = options.maxItems ?? 10;

  const items: ReviewItem[] = [];

  for (const state of states) {
    const graded = state.attempts.length;
    const recent = state.attempts.slice(-5);
    const recentCorrect = recent.filter((a) => a.correct).length;
    const recentAccuracy = recent.length === 0 ? null : recentCorrect / recent.length;
    const hints = state.attempts.filter((a) => a.hintUsed).length;
    const hasFailures = state.attempts.some((a) => !a.correct);

    // §10: do not force review when the child is already demonstrating mastery,
    // unless the topic has gone stale long enough to warrant a light refresher.
    const mastered = state.mastery === 'mastered';
    if (mastered && !isStale(state.lastActivityAt, staleAfterMs, now)) continue;

    if (state.reviewStatus === 'needs_review' || (recentAccuracy !== null && recentAccuracy < 0.5)) {
      items.push({
        topicId: state.topicId,
        priority: 'high',
        reason: 'Recent answers suggest the concept is slipping.',
        suggestedMechanisms: ['short quiz', 'previously incorrect questions'],
      });
      continue;
    }

    if (hasFailures || hints > 0) {
      items.push({
        topicId: state.topicId,
        priority: 'medium',
        reason: 'Some answers needed hints or retries.',
        suggestedMechanisms: ['flashcards', 'previously incorrect questions'],
      });
      continue;
    }

    if (mastered && isStale(state.lastActivityAt, staleAfterMs, now)) {
      items.push({
        topicId: state.topicId,
        priority: 'low',
        reason: 'Mastered earlier; a light refresher keeps retention strong.',
        suggestedMechanisms: ['flashcards'],
      });
      continue;
    }

    if (graded > 0 && isStale(state.lastActivityAt, staleAfterMs, now)) {
      items.push({
        topicId: state.topicId,
        priority: 'low',
        reason: 'Learned a while ago; a quick check keeps it fresh.',
        suggestedMechanisms: ['flashcards', 'short quiz'],
      });
    }
  }

  const priorityRank: Record<ReviewPriority, number> = { high: 0, medium: 0.5, low: 1 };
  items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  return {
    items: items.slice(0, maxItems),
    generatedAt: now,
  };
}
