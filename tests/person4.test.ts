import { describe, expect, it } from 'vitest';
import {
  LearningEventCollector,
  InMemoryProgressStore,
  emptyTopicState,
  applyQuestionAttempt,
  setTopicMastery,
  markTopicActivityCompleted,
  migrateTopicState,
  evaluateProgress,
  computeProgressSignals,
  estimateMastery,
  buildSpacedReviewSchedule,
  type AttemptRecord,
  type LearningEvent,
  type TopicProgressState,
} from '../src/person4/index.js';

const DAY = 24 * 60 * 60 * 1000;

function topicState(overrides: Partial<TopicProgressState> = {}): TopicProgressState {
  return {
    ...emptyTopicState({
      curriculumId: 'solar-system',
      topicId: 'solar-system-jupiter',
      artifactId: 'artifact-jupiter-v1',
      artifactVersion: 1,
      learningObjectives: [
        { id: 'obj-1', statement: 'Identify Jupiter as a gas giant' },
        { id: 'obj-2', statement: 'Explain why Jupiter is much larger than Earth' },
      ],
    }),
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    questionId: 'q1',
    activityId: 'quiz-01',
    attempt: 1,
    correct: true,
    hintUsed: false,
    answerRevealed: false,
    difficulty: 'medium',
    timestamp: Date.now(),
    ...overrides,
  };
}

function answeredEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    event: 'question_answered',
    topicId: 'solar-system-jupiter',
    curriculumId: 'solar-system',
    artifactId: 'artifact-jupiter-v1',
    artifactVersion: 1,
    activityId: 'quiz-01',
    questionId: 'q1',
    correct: true,
    attempt: 1,
    ...overrides,
  } as LearningEvent;
}

const OBJ_MAP = { 'obj-1': ['q1', 'q2'], 'obj-2': ['q3', 'q4'] };

describe('LearningEventCollector', () => {
  it('records valid events and stamps timestamps', () => {
    const collector = new LearningEventCollector();
    collector.record(answeredEvent({ timestamp: undefined }));
    expect(collector.size()).toBe(1);
    expect(collector.pending()[0].timestamp).toBeGreaterThan(0);
  });

  it('drops invalid events without throwing', () => {
    const collector = new LearningEventCollector();
    collector.record({} as LearningEvent);
    collector.record(answeredEvent({ artifactVersion: NaN }));
    expect(collector.size()).toBe(0);
    expect(collector.droppedEvents).toBe(2);
  });

  it('flushes to the sink and clears the queue', async () => {
    const flushed: LearningEvent[][] = [];
    const collector = new LearningEventCollector({
      sink: { append: async (events) => void flushed.push([...events]) },
    });
    collector.record(answeredEvent());
    collector.record(answeredEvent({ event: 'topic_opened' }));
    await collector.flush();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
    expect(collector.size()).toBe(0);
    expect(collector.deliveredEvents).toBe(2);
  });

  it('keeps events buffered when the sink fails', async () => {
    const collector = new LearningEventCollector({
      sink: { append: async () => { throw new Error('network down'); } },
    });
    collector.record(answeredEvent());
    await expect(collector.flush()).rejects.toThrow('network down');
    expect(collector.size()).toBe(1); // not lost (§28)
    const good = new LearningEventCollector({ sink: { append: async () => {} } });
    good.record(answeredEvent());
    await good.flush();
  });

  it('enforces queue capacity', () => {
    const collector = new LearningEventCollector({ queueCapacity: 2 });
    collector.record(answeredEvent());
    collector.record(answeredEvent());
    collector.record(answeredEvent());
    expect(collector.size()).toBe(2);
    expect(collector.droppedEvents).toBe(1);
  });

  it('creates typed question events with defaults', () => {
    const collector = new LearningEventCollector();
    const event = collector.questionAnswered({
      topicId: 't', curriculumId: 'c', artifactId: 'a', artifactVersion: 1,
      activityId: 'quiz', questionId: 'q1', correct: false, attempt: 2,
    });
    expect(event.hintUsed).toBe(false);
    expect(event.answerRevealed).toBe(false);
    expect(collector.size()).toBe(1);
  });
});

describe('InMemoryProgressStore', () => {
  it('round-trips topic state', async () => {
    const store = new InMemoryProgressStore();
    const state = topicState();
    await store.saveTopic(state);
    const loaded = await store.loadTopic('solar-system', 'solar-system-jupiter');
    expect(loaded).not.toBeNull();
    expect(loaded?.attempts).toEqual([]);
    // mutations after save must not corrupt stored history
    state.attempts.push(attempt());
    const again = await store.loadTopic('solar-system', 'solar-system-jupiter');
    expect(again?.attempts).toHaveLength(0);
  });

  it('migrates state to a new artifact version while preserving history (§17)', () => {
    const existing = topicState({ attempts: [attempt()] });
    const migrated = migrateTopicState({
      existing,
      newArtifactId: 'artifact-jupiter-v2',
      newArtifactVersion: 2,
    });
    expect(migrated.artifactId).toBe('artifact-jupiter-v2');
    expect(migrated.artifactVersion).toBe(2);
    expect(migrated.attempts).toHaveLength(1); // history preserved
    expect(migrated.learningObjectives).toEqual(existing.learningObjectives);
  });
});

describe('progress evaluation', () => {
  it('reports no graded answers for a fresh topic', () => {
    const evaluation = evaluateProgress(topicState());
    expect(evaluation.signals.accuracy).toBe(0);
    expect(evaluation.reviewStatus).toBe('not_started');
    expect(evaluation.summary).toContain('no graded answers yet');
  });

  it('marks in_progress after attempts', () => {
    const state = topicState({ attempts: [attempt(), attempt({ correct: true, questionId: 'q2' })] });
    expect(evaluateProgress(state).reviewStatus).toBe('in_progress');
  });

  it('flags needs_review when recent answers slip (§9)', () => {
    const attempts = [
      attempt({ questionId: 'q1' }), attempt({ questionId: 'q2' }),
      attempt({ questionId: 'q3' }), attempt({ questionId: 'q4', correct: false }),
      attempt({ questionId: 'q5', correct: false }), attempt({ questionId: 'q6', correct: false }),
    ];
    const evaluation = evaluateProgress(topicState({ attempts }));
    expect(evaluation.reviewStatus).toBe('needs_review');
    expect(evaluation.signals.recentAccuracy).toBeLessThan(0.5);
  });

  it('never treats time alone as progress (§9)', () => {
    const state = topicState();
    const signals = computeProgressSignals(state, { timeSpentSeconds: 3600 });
    expect(signals.timeSpentSeconds).toBe(3600);
    expect(signals.accuracy).toBe(0);
    expect(evaluateProgress(state, { timeSpentSeconds: 3600 }).reviewStatus).toBe('not_started');
  });

  it('classifies objectives as met or struggling using the question map', () => {
    const state = topicState({
      attempts: [
        attempt({ questionId: 'q1' }),                      // obj-1 met
        attempt({ questionId: 'q3', correct: false }),      // obj-2 struggling
      ],
    });
    const evaluation = evaluateProgress(topicState({ attempts: state.attempts }), {
      objectiveQuestionMap: OBJ_MAP,
    });
    expect(evaluation.objectivesMet).toEqual(['obj-1']);
    expect(evaluation.objectivesStruggling).toEqual(['obj-2']);
  });
});

describe('mastery estimation', () => {
  it('caps confidence with thin evidence (§22)', () => {
    const state = topicState({ attempts: [attempt(), attempt({ questionId: 'q2' })] });
    const estimate = estimateMastery(state);
    expect(estimate.level).toBe('developing');
    expect(estimate.reasons.some((r) => r.includes('mastery capped'))).toBe(true);
  });

  it('reaches proficient with strong varied evidence', () => {
    const state = topicState({
      attempts: [
        attempt({ questionId: 'q1' }),
        attempt({ questionId: 'q2' }),
        attempt({ questionId: 'q3' }),
        attempt({ questionId: 'q4' }),
        attempt({ questionId: 'q5' }),
      ],
      activitiesCompleted: ['intro', 'flashcards', 'quiz-01'],
      learningObjectives: [],
    });
    const estimate = estimateMastery(state);
    expect(['proficient', 'mastered']).toContain(estimate.level);
  });

  it('never hands out mastered from a single perfect quiz (§22)', () => {
    const state = topicState({
      attempts: [attempt({ questionId: 'q1' }), attempt({ questionId: 'q2' })],
      activitiesCompleted: ['quiz-01'],
      learningObjectives: [],
    });
    expect(estimateMastery(state).level).not.toBe('mastered');
  });

  it('caps mastery when every question was easy', () => {
    const state = topicState({
      attempts: Array.from({ length: 6 }, (_, i) =>
        attempt({ questionId: `q${i + 1}`, difficulty: 'easy' })),
      activitiesCompleted: ['a', 'b', 'c'],
      learningObjectives: [],
    });
    const estimate = estimateMastery(state);
    expect(estimate.level).not.toBe('mastered');
    expect(estimate.reasons.some((r) => r.includes('easy difficulty'))).toBe(true);
  });

  it('uses delayed recall as retention evidence', () => {
    const base = topicState({
      attempts: Array.from({ length: 6 }, (_, i) => attempt({ questionId: `q${i + 1}` })),
      activitiesCompleted: ['a', 'b'],
      learningObjectives: [],
    });
    const withGoodRecall = estimateMastery(base, { delayedRecallAccuracy: 0.95 });
    const withBadRecall = estimateMastery(base, { delayedRecallAccuracy: 0.3 });
    expect(withGoodRecall.confidence).toBeGreaterThan(withBadRecall.confidence);
  });

  it('sets topic completed only via setTopicMastery at mastered level', () => {
    const state = setTopicMastery(topicState({ attempts: [attempt()] }), 'mastered', Date.now());
    expect(state.reviewStatus).toBe('completed');
    const partial = setTopicMastery(topicState({ attempts: [attempt()] }), 'developing', Date.now());
    expect(partial.reviewStatus).toBe('in_progress');
  });
});

describe('spaced review', () => {
  it('skips recently mastered topics (§10)', () => {
    const now = Date.now();
    const state = setTopicMastery(
      topicState({ attempts: [attempt()], lastActivityAt: now - DAY }),
      'mastered',
      now,
    );
    const schedule = buildSpacedReviewSchedule([state], { now });
    expect(schedule.items).toHaveLength(0);
  });

  it('surfaces slipping topics at high priority', () => {
    const now = Date.now();
    const state = topicState({
      reviewStatus: 'needs_review',
      attempts: [attempt({ correct: false })],
      lastActivityAt: now - DAY,
    });
    const schedule = buildSpacedReviewSchedule([state], { now });
    expect(schedule.items[0].priority).toBe('high');
    expect(schedule.items[0].suggestedMechanisms).toContain('previously incorrect questions');
  });

  it('schedules hinted topics at medium priority', () => {
    const now = Date.now();
    const state = topicState({
      attempts: [attempt({ hintUsed: true })],
      lastActivityAt: now - DAY,
    });
    const schedule = buildSpacedReviewSchedule([state], { now });
    expect(schedule.items[0].priority).toBe('medium');
  });

  it('resurfaces stale learned topics at low priority', () => {
    const now = Date.now();
    const state = topicState({
      attempts: [attempt()],
      lastActivityAt: now - 10 * DAY,
    });
    const schedule = buildSpacedReviewSchedule([state], { now });
    expect(schedule.items[0].priority).toBe('low');
  });

  it('sorts by priority and caps the list', () => {
    const now = Date.now();
    const slipping = topicState({
      topicId: 'a-slipping',
      reviewStatus: 'needs_review',
      attempts: [attempt({ correct: false })],
      lastActivityAt: now - DAY,
    });
    const stale = topicState({
      topicId: 'b-stale',
      attempts: [attempt()],
      lastActivityAt: now - 10 * DAY,
    });
    const schedule = buildSpacedReviewSchedule([stale, slipping], { now, maxItems: 1 });
    expect(schedule.items).toHaveLength(1);
    expect(schedule.items[0].topicId).toBe('a-slipping');
  });
});

describe('activity bookkeeping', () => {
  it('marks activities completed without duplicates', () => {
    let state = topicState();
    state = markTopicActivityCompleted(state, 'intro');
    state = markTopicActivityCompleted(state, 'intro');
    expect(state.activitiesCompleted).toEqual(['intro']);
    expect(state.reviewStatus).toBe('in_progress');
  });

  it('keeps lastActivityAt as the max timestamp', () => {
    let state = topicState({ lastActivityAt: 5000 });
    state = applyQuestionAttempt(state, attempt({ timestamp: 1000 }));
    expect(state.lastActivityAt).toBe(5000);
    state = applyQuestionAttempt(state, attempt({ timestamp: 9000 }));
    expect(state.lastActivityAt).toBe(9000);
  });

  it('merges attempts per question without duplicates', () => {
    let state = topicState();
    state = applyQuestionAttempt(state, attempt({ attempt: 1, correct: false }));
    state = applyQuestionAttempt(state, attempt({ attempt: 1, correct: false })); // idempotent replace
    expect(state.attempts).toHaveLength(1);
    state = applyQuestionAttempt(state, attempt({ attempt: 2, correct: true }));
    expect(state.attempts).toHaveLength(2);
  });
});
