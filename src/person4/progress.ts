import type {
  AttemptRecord,
  LearningObjective,
  ProgressEvaluation,
  ProgressSignals,
  ReviewStatus,
  TopicProgressState,
} from './types.js';

/**
 * Multi-signal progress calculation (spec §9).
 *
 * Core rule: no single signal — especially time spent — decides progress.
 * Progress combines correctness, independence, recency, variety, and
 * objective coverage. The UI only emits events; all calculation lives here.
 */

export interface ProgressThresholds {
  /** Attempts needed before "recent" window judgments are stable. */
  recentWindow: number;
  /** recentAccuracy at or above this counts as holding onto the concept. */
  recentAccuracyOk: number;
  /** Below this (with enough attempts) the topic is flagged needs_review. */
  recentAccuracyStruggling: number;
  /** Graded attempts required before completion is possible. */
  minAttemptsForCompletion: number;
  /** Independence at or above this required for completion. */
  independenceForCompletion: number;
}

export const DEFAULT_PROGRESS_THRESHOLDS: ProgressThresholds = {
  recentWindow: 5,
  recentAccuracyOk: 0.7,
  recentAccuracyStruggling: 0.5,
  minAttemptsForCompletion: 4,
  independenceForCompletion: 0.6,
};

/**
 * Maps objectiveId → questionIds that assess it. Artifacts provide this so
 * progress can be judged per learning objective rather than per topic.
 */
export type ObjectiveQuestionMap = Record<string, readonly string[]>;

const round2 = (n: number): number => Math.round(n * 100) / 100;

function ratio(correct: number, total: number): number {
  return total === 0 ? 0 : correct / total;
}

export function computeProgressSignals(
  state: TopicProgressState,
  options: {
    timeSpentSeconds?: number;
    objectiveQuestionMap?: ObjectiveQuestionMap;
    thresholds?: ProgressThresholds;
  } = {},
): ProgressSignals {
  const thresholds = options.thresholds ?? DEFAULT_PROGRESS_THRESHOLDS;
  const attempts = state.attempts;

  const graded = attempts.filter((a) => typeof a.correct === 'boolean');
  const correct = graded.filter((a) => a.correct).length;
  const firstAttempt = graded.filter((a) => a.attempt === 1);
  const firstAttemptCorrect = firstAttempt.filter((a) => a.correct).length;
  const independent = graded.filter((a) => !a.hintUsed && !a.answerRevealed);
  const independentCorrect = independent.filter((a) => a.correct).length;

  const recent = graded.slice(-thresholds.recentWindow);
  const recentCorrect = recent.filter((a) => a.correct).length;

  const objectives = state.learningObjectives;
  let covered = 0;
  if (objectives.length > 0 && options.objectiveQuestionMap) {
    for (const objective of objectives) {
      const questions = options.objectiveQuestionMap[objective.id] ?? [];
      if (questions.length > 0 && attempts.some((a) => questions.includes(a.questionId))) {
        covered += 1;
      }
    }
  }

  return {
    accuracy: round2(ratio(correct, graded.length)),
    firstAttemptAccuracy: round2(ratio(firstAttemptCorrect, firstAttempt.length)),
    independence: round2(ratio(independentCorrect, independent.length)),
    activityVariety: state.activitiesCompleted.length,
    recentAccuracy: round2(ratio(recentCorrect, recent.length)),
    objectiveCoverage: objectives.length === 0 ? 0 : round2(covered / objectives.length),
    timeSpentSeconds: options.timeSpentSeconds ?? 0,
  };
}

function objectiveOutcome(
  objective: LearningObjective,
  attempts: readonly AttemptRecord[],
  map: ObjectiveQuestionMap | undefined,
): 'unassessed' | 'met' | 'struggling' {
  if (!map) return 'unassessed';
  const questions = map[objective.id] ?? [];
  const relevant = attempts.filter((a) => questions.includes(a.questionId));
  if (relevant.length === 0) return 'unassessed';
  const firstTry = relevant.filter((a) => a.attempt === 1);
  const firstTryCorrect = firstTry.filter((a) => a.correct).length;
  const latest = relevant[relevant.length - 1];
  if (firstTry.length > 0 && ratio(firstTryCorrect, firstTry.length) >= 0.7 && latest.correct) {
    return 'met';
  }
  if (!latest.correct || ratio(firstTryCorrect, firstTry.length) < 0.5) {
    return 'struggling';
  }
  return 'met';
}

/**
 * Evaluates a topic's progress from its persisted state. Observed data only —
 * recommendations are layered on top by the reporting layer (§15, §16).
 */
export function evaluateProgress(
  state: TopicProgressState,
  options: {
    timeSpentSeconds?: number;
    objectiveQuestionMap?: ObjectiveQuestionMap;
    thresholds?: ProgressThresholds;
  } = {},
): ProgressEvaluation {
  const thresholds = options.thresholds ?? DEFAULT_PROGRESS_THRESHOLDS;
  const signals = computeProgressSignals(state, options);

  const objectivesMet: string[] = [];
  const objectivesStruggling: string[] = [];
  for (const objective of state.learningObjectives) {
    const outcome = objectiveOutcome(objective, state.attempts, options.objectiveQuestionMap);
    if (outcome === 'met') objectivesMet.push(objective.id);
    if (outcome === 'struggling') objectivesStruggling.push(objective.id);
  }

  const gradedCount = state.attempts.length;
  let reviewStatus: ReviewStatus = state.reviewStatus;
  if (state.mastery === 'mastered') {
    reviewStatus = 'completed';
  } else if (
    gradedCount >= thresholds.minAttemptsForCompletion &&
    signals.recentAccuracy < thresholds.recentAccuracyStruggling
  ) {
    reviewStatus = 'needs_review';
  } else if (gradedCount > 0) {
    reviewStatus = 'in_progress';
  } else if (reviewStatus === 'needs_review' && gradedCount === 0) {
    reviewStatus = 'needs_review';
  }

  const parts: string[] = [];
  if (gradedCount > 0) {
    parts.push(`${Math.round(signals.accuracy * 100)}% of ${gradedCount} answers correct`);
  } else {
    parts.push('no graded answers yet');
  }
  if (signals.activityVariety > 0) {
    parts.push(`${signals.activityVariety} activity(ies) completed`);
  }
  if (signals.recentAccuracy > 0 && gradedCount >= thresholds.recentWindow) {
    parts.push(
      signals.recentAccuracy >= thresholds.recentAccuracyOk
        ? 'recent answers show the concept is holding'
        : 'recent answers suggest the concept is slipping',
    );
  }
  if (signals.independence > 0 && gradedCount > 0) {
    parts.push(`${Math.round(signals.independence * 100)}% answered without hints`);
  }
  if (signals.objectiveCoverage > 0) {
    parts.push(`${Math.round(signals.objectiveCoverage * 100)}% of objectives assessed`);
  }

  return {
    topicId: state.topicId,
    signals,
    reviewStatus,
    objectivesMet,
    objectivesStruggling,
    summary: parts.join('; ') + '.',
  };
}
