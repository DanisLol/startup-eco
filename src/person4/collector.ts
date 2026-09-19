import {
  type Difficulty,
  type LearningEvent,
  type QuestionAnsweredEvent,
} from './types.js';

/**
 * Storage-agnostic sink for flushed learning events (spec §21, §26).
 *
 * Person 1 (reports) and Person 2 (reliability/debugging, §28) consume this;
 * the app wires in whatever backend it has.
 */
export interface EventSink {
  append(events: readonly LearningEvent[]): Promise<void>;
}

/** Buffers events in memory until flushed; keeps the last N on failure (§28). */
export interface EventQueue {
  /** Timestamp is stamped by the collector when missing. */
  record(event: LearningEvent): void;
  size(): number;
  /** Push all buffered events to the sink. Throws if the sink fails. */
  flush(): Promise<void>;
  /** All buffered events, oldest first (copy). */
  pending(): readonly LearningEvent[];
}

export interface CollectorOptions {
  sink?: EventSink;
  queueCapacity?: number;
}

const DEFAULT_QUEUE_CAPACITY = 1000;

function normalizeEvent(event: LearningEvent): LearningEvent {
  return {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  };
}

/**
 * Validates and records learning events, buffering them for delivery.
 *
 * The collector never throws on invalid events — malformed input is dropped
 * and counted, so a buggy artifact cannot break event capture for the rest of
 * the app (§21: events must be reliable; §28: learning continues on failure).
 */
export class LearningEventCollector implements EventQueue {
  private readonly queue: LearningEvent[] = [];
  private readonly capacity: number;
  private sink: EventSink | null;
  droppedEvents = 0;
  deliveredEvents = 0;

  constructor(options: CollectorOptions = {}) {
    this.capacity = Math.max(1, options.queueCapacity ?? DEFAULT_QUEUE_CAPACITY);
    this.sink = options.sink ?? null;
  }

  setSink(sink: EventSink): void {
    this.sink = sink;
  }

  record(event: LearningEvent): void {
    if (!event || typeof event !== 'object') {
      this.droppedEvents += 1;
      return;
    }
    if (!event.event || !event.topicId || !event.curriculumId || !event.artifactId) {
      this.droppedEvents += 1;
      return;
    }
    if (typeof event.artifactVersion !== 'number' || !Number.isFinite(event.artifactVersion)) {
      this.droppedEvents += 1;
      return;
    }
    if (this.queue.length >= this.capacity) {
      this.droppedEvents += 1;
      return;
    }
    this.queue.push(normalizeEvent(event));
  }

  /** Creates a well-typed question event; validation still applies in record(). */
  questionAnswered(input: {
    topicId: string;
    curriculumId: string;
    artifactId: string;
    artifactVersion: number;
    activityId: string;
    questionId: string;
    correct: boolean;
    attempt: number;
    hintUsed?: boolean;
    answerRevealed?: boolean;
    difficulty?: Difficulty;
    timestamp?: number;
  }): QuestionAnsweredEvent {
    const event: QuestionAnsweredEvent = {
      event: 'question_answered',
      topicId: input.topicId,
      curriculumId: input.curriculumId,
      artifactId: input.artifactId,
      artifactVersion: input.artifactVersion,
      activityId: input.activityId,
      questionId: input.questionId,
      correct: input.correct,
      attempt: input.attempt,
      hintUsed: input.hintUsed ?? false,
      answerRevealed: input.answerRevealed ?? false,
      difficulty: input.difficulty,
      timestamp: input.timestamp,
    };
    this.record(event);
    return event;
  }

  size(): number {
    return this.queue.length;
  }

  pending(): readonly LearningEvent[] {
    return [...this.queue];
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    if (!this.sink) {
      throw new Error('No event sink configured; cannot flush events.');
    }
    const batch = [...this.queue];
    await this.sink.append(batch);
    this.queue.length = 0;
    this.deliveredEvents += batch.length;
  }
}
