/**
 * Shared domain model for the AI Learning App.
 *
 * Person 4 owns this file: the ID schema and event/progress contracts that the
 * rest of the team codes against. Keep it dependency-free and additive.
 */

// ---------------------------------------------------------------------------
// Identifiers (spec §4, §17, §18)
// ---------------------------------------------------------------------------

export type TopicId = string;
export type CurriculumId = string;
export type ArtifactId = string;
export type ActivityId = string;
export type QuestionId = string;
/** Monotonic artifact version, e.g. artifact-jupiter-v2 has version 2. */
export type ArtifactVersion = number;

export interface ArtifactRef {
  artifactId: ArtifactId;
  curriculumId: CurriculumId;
  topicId: TopicId;
  version: ArtifactVersion;
}

// ---------------------------------------------------------------------------
// Learning objectives (spec §4, §6, §17)
// ---------------------------------------------------------------------------

export interface LearningObjective {
  id: string;
  /** What the child should understand or be able to do. */
  statement: string;
}

// ---------------------------------------------------------------------------
// Progress events (spec §21)
// ---------------------------------------------------------------------------

export const LearningEventType = [
  'topic_opened',
  'lesson_started',
  'section_viewed',
  'animation_started',
  'animation_completed',
  'flashcard_viewed',
  'flashcard_recalled',
  'activity_started',
  'activity_completed',
  'question_answered',
  'hint_requested',
  'answer_revealed',
  'quiz_started',
  'quiz_completed',
  'topic_completed',
  'review_completed',
] as const;

export type LearningEventType = (typeof LearningEventType)[number];

/** Core event fields every artifact event must carry. */
export interface LearningEvent {
  event: LearningEventType;
  topicId: TopicId;
  curriculumId: CurriculumId;
  artifactId: ArtifactId;
  artifactVersion: ArtifactVersion;
  /** Educationally meaningful grouping, e.g. "jupiter-quiz-01". */
  activityId?: ActivityId;
  questionId?: QuestionId;
  /** Milliseconds since epoch. Set by the collector when absent. */
  timestamp?: number;
  /** Free-form, small, structured detail: selected choice, duration, etc. */
  payload?: Record<string, unknown>;
}

export interface QuestionAnsweredEvent extends LearningEvent {
  event: 'question_answered';
  activityId: ActivityId;
  questionId: QuestionId;
  /** Was the attempt correct? */
  correct: boolean;
  /** 1-based attempt count for this question. */
  attempt: number;
  /** Was a hint used before answering? */
  hintUsed?: boolean;
  /** Was the answer revealed before answering (child gave up)? */
  answerRevealed?: boolean;
  /** Approximate difficulty tag of the question, when the artifact knows it. */
  difficulty?: Difficulty;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

// ---------------------------------------------------------------------------
// Persistence (spec §17)
// ---------------------------------------------------------------------------

export interface AttemptRecord {
  questionId: QuestionId;
  activityId: ActivityId;
  attempt: number;
  correct: boolean;
  hintUsed: boolean;
  answerRevealed: boolean;
  difficulty: Difficulty | null;
  timestamp: number;
}

export interface TopicProgressState {
  curriculumId: CurriculumId;
  topicId: TopicId;
  artifactId: ArtifactId;
  artifactVersion: ArtifactVersion;
  learningObjectives: LearningObjective[];
  activitiesCompleted: string[];
  attempts: AttemptRecord[];
  /** Simple aggregate score in [0,1]; prefer ProgressEvaluation for decisions. */
  score: number | null;
  mastery: MasteryLevel | null;
  masteryUpdatedAt: number | null;
  lastActivityAt: number | null;
  /** not_started | in_progress | completed | needs_review */
  reviewStatus: ReviewStatus;
}

export type ReviewStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_review';

// ---------------------------------------------------------------------------
// Progress evaluation (spec §9)
// ---------------------------------------------------------------------------

export interface ProgressSignals {
  /** Correct answers / total graded answers across attempts. */
  accuracy: number;
  /** Share of questions answered correctly on the first attempt. */
  firstAttemptAccuracy: number;
  /** Share of answers given without hints or revealed answers. */
  independence: number;
  /** Number of distinct activities the child engaged with. */
  activityVariety: number;
  /** Sustained performance: accuracy over the most recent attempts window. */
  recentAccuracy: number;
  /** Share of the topic's learning objectives with at least one graded hit. */
  objectiveCoverage: number;
  /** Total time on task in seconds — informative, never decisive alone. */
  timeSpentSeconds: number;
}

export interface ProgressEvaluation {
  topicId: TopicId;
  signals: ProgressSignals;
  reviewStatus: ReviewStatus;
  /** Which objectives look learned vs. shaky, based on graded evidence. */
  objectivesMet: string[];
  objectivesStruggling: string[];
  /** Human-readable summary suitable for the parent daily report (§15). */
  summary: string;
}

// ---------------------------------------------------------------------------
// Mastery (spec §22)
// ---------------------------------------------------------------------------

export type MasteryLevel = 'novice' | 'developing' | 'proficient' | 'mastered';

export interface MasteryEstimate {
  topicId: TopicId;
  level: MasteryLevel;
  /** Continuous confidence in [0,1] behind the level. */
  confidence: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Spaced review (spec §10)
// ---------------------------------------------------------------------------

export type ReviewPriority = 'high' | 'medium' | 'low';

export interface ReviewItem {
  topicId: TopicId;
  priority: ReviewPriority;
  /** Why this item was selected for review. */
  reason: string;
  /** Suggested mechanisms, e.g. flashcards, short quiz, prior mistakes. */
  suggestedMechanisms: string[];
}

export interface SpacedReviewSchedule {
  /** Items ordered high → low priority. */
  items: ReviewItem[];
  generatedAt: number;
}
