import type {
  AttemptRecord,
  CurriculumId,
  LearningObjective,
  MasteryLevel,
  ReviewStatus,
  TopicId,
  TopicProgressState,
} from './types.js';

/**
 * Persistence contract for progress state (spec §17, §26).
 *
 * The UI renders state and emits events; long-term progress lives here so the
 * store can be swapped (in-memory for tests/dev, real backend later) without
 * touching the progress or report logic.
 */
export interface ProgressStore {
  loadTopic(curriculumId: CurriculumId, topicId: TopicId): Promise<TopicProgressState | null>;
  saveTopic(state: TopicProgressState): Promise<void>;
}

/** Snapshot of everything needed to restore a child's session (§17). */
export interface PersistedSnapshot {
  topics: TopicProgressState[];
}

export interface SnapshotStore {
  loadSnapshot(curriculumId: CurriculumId): Promise<PersistedSnapshot | null>;
  saveSnapshot(snapshot: PersistedSnapshot): Promise<void>;
}

export function emptyTopicState(input: {
  curriculumId: CurriculumId;
  topicId: TopicId;
  artifactId: string;
  artifactVersion: number;
  learningObjectives?: LearningObjective[];
}): TopicProgressState {
  return {
    curriculumId: input.curriculumId,
    topicId: input.topicId,
    artifactId: input.artifactId,
    artifactVersion: input.artifactVersion,
    learningObjectives: input.learningObjectives ?? [],
    activitiesCompleted: [],
    attempts: [],
    score: null,
    mastery: null,
    masteryUpdatedAt: null,
    lastActivityAt: null,
    reviewStatus: 'not_started',
  };
}

/**
 * Preserves the child's history when an artifact is regenerated (§17).
 *
 * Progress belongs to the (curriculum, topic) pair. The artifact id/version
 * updates to the new generation, while attempts, activities, mastery, and
 * review status carry forward. Regeneration must never erase progress.
 */
export function migrateTopicState(input: {
  existing: TopicProgressState;
  newArtifactId: string;
  newArtifactVersion: number;
  /** New objective list; matched by id to keep objective history useful. */
  newLearningObjectives?: LearningObjective[];
}): TopicProgressState {
  return {
    ...input.existing,
    artifactId: input.newArtifactId,
    artifactVersion: input.newArtifactVersion,
    learningObjectives: input.newLearningObjectives ?? input.existing.learningObjectives,
  };
}

function mergeAttempt(existing: AttemptRecord[], incoming: AttemptRecord): AttemptRecord[] {
  const next = [...existing];
  const index = next.findIndex(
    (a) => a.activityId === incoming.activityId && a.questionId === incoming.questionId && a.attempt === incoming.attempt,
  );
  if (index >= 0) next[index] = incoming;
  else next.push(incoming);
  return next;
}

/**
 * In-memory implementation. Use for dev and tests; implement ProgressStore
 * against a real database for production without changing callers.
 */
export class InMemoryProgressStore implements ProgressStore, SnapshotStore {
  private readonly topics = new Map<string, TopicProgressState>();

  private key(curriculumId: CurriculumId, topicId: TopicId): string {
    return `${curriculumId}::${topicId}`;
  }

  async loadTopic(curriculumId: CurriculumId, topicId: TopicId): Promise<TopicProgressState | null> {
    return this.topics.get(this.key(curriculumId, topicId)) ?? null;
  }

  async saveTopic(state: TopicProgressState): Promise<void> {
    // Store a copy so callers mutating their object afterwards cannot corrupt history.
    this.topics.set(this.key(state.curriculumId, state.topicId), { ...state, attempts: [...state.attempts] });
  }

  async loadSnapshot(curriculumId: CurriculumId): Promise<PersistedSnapshot | null> {
    const topics = [...this.topics.values()].filter((t) => t.curriculumId === curriculumId);
    if (topics.length === 0) return null;
    return { topics };
  }

  async saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
    for (const topic of snapshot.topics) await this.saveTopic(topic);
  }
}

export function applyQuestionAttempt(
  state: TopicProgressState,
  attempt: AttemptRecord,
): TopicProgressState {
  const next: TopicProgressState = {
    ...state,
    attempts: mergeAttempt(state.attempts, attempt),
    lastActivityAt: Math.max(state.lastActivityAt ?? attempt.timestamp, attempt.timestamp),
  };
  if (state.reviewStatus === 'not_started') next.reviewStatus = 'in_progress';
  return next;
}

export function setTopicMastery(
  state: TopicProgressState,
  level: MasteryLevel,
  timestamp: number,
): TopicProgressState {
  return {
    ...state,
    mastery: level,
    masteryUpdatedAt: timestamp,
    reviewStatus: level === 'mastered' ? 'completed' : state.reviewStatus === 'not_started' ? 'in_progress' : state.reviewStatus,
  };
}

export function markTopicActivityCompleted(
  state: TopicProgressState,
  activityId: string,
): TopicProgressState {
  if (state.activitiesCompleted.includes(activityId)) return state;
  return {
    ...state,
    activitiesCompleted: [...state.activitiesCompleted, activityId],
    lastActivityAt: state.lastActivityAt ?? Date.now(),
    reviewStatus: state.reviewStatus === 'not_started' ? 'in_progress' : state.reviewStatus,
  };
}
