import { fixtureArtifact, FIXTURE_CHILD_AGE, FIXTURE_CHILD_NAME, FIXTURE_TOPIC } from "./fixture";
import { computeStats, describeActivity } from "./stats";
import type { Child, ChildSummary, DashboardData, Family, Lesson, ParentHomeData, ParentUpdate, Session } from "./types";

/**
 * Local-only fixture for presenting the parent dashboard without Supabase.
 * This is intentionally never used in production.
 */
export function getDemoParentDashboardData(): DashboardData {
  const now = new Date();
  const startedAt = new Date(now.getTime() - 12 * 60 * 1000).toISOString();
  const endedAt = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const family: Family = {
    id: "demo-family",
    phone: "+15555550107",
    code: "MIA4K2",
    child_name: FIXTURE_CHILD_NAME,
    child_age: FIXTURE_CHILD_AGE,
    created_at: startedAt,
    parent_user_id: "demo-parent",
  };
  const child: Child = {
    id: "demo-child",
    family_id: family.id,
    name: FIXTURE_CHILD_NAME,
    age: FIXTURE_CHILD_AGE,
    created_at: startedAt,
  };
  const lesson: Lesson = {
    id: "demo-lesson",
    family_id: family.id,
    child_id: child.id,
    topic: FIXTURE_TOPIC,
    status: "ready",
    roadmap: [
      "Lesson 1: Why Volcanoes Erupt",
      "Lesson 2: Inside the Earth",
      "Lesson 3: Famous Volcanoes",
      "Lesson 4: How to Stay Safe",
    ],
    artifact: fixtureArtifact,
    created_at: startedAt,
  };
  const session: Session = {
    id: "demo-session",
    lesson_id: lesson.id,
    progress: {
      completed: ["explain-1", "quiz-1", "explain-2"],
      answers: { "quiz-1": { choice: 1, correct: true } },
      reflection: "The lava was my favorite part.",
    },
    started_at: startedAt,
    ended_at: endedAt,
    debrief: null,
  };
  const stats = computeStats({
    childName: family.child_name,
    artifact: fixtureArtifact,
    progress: session.progress,
    startedAt,
    endedAt,
  });
  const update: ParentUpdate = {
    id: "demo-update",
    family_id: family.id,
    session_id: session.id,
    lesson_id: lesson.id,
    message_body: "Mia spent 10 minutes on \"Why Volcanoes Erupt\". They stopped after 3 of 5 steps. They got 1 of 1 quiz questions right. Ask them about When magma becomes lava.",
    observed_stats: stats,
    suggested_next_steps: ["Return to finish the lesson when ready."],
    sms_status: "sent",
    sms_sent_at: endedAt,
    sms_error: null,
    created_at: endedAt,
  };

  return {
    family,
    child,
    lesson,
    sessions: [{ session, lesson, stats, activity: describeActivity({ artifact: fixtureArtifact, progress: session.progress }) }],
    updates: [update],
  };
}

export function getDemoParentHomeData(): ParentHomeData {
  const detail = getDemoParentDashboardData();
  const latest = detail.sessions[0];
  const child: ChildSummary = {
    ...detail.child,
    currentTopic: detail.lesson?.topic ?? null,
    sessionsCompleted: detail.sessions.filter((item) => !item.stats.stoppedEarly).length,
    stepsCompleted: latest?.stats.stepsCompleted ?? 0,
    stepsTotal: latest?.stats.stepsTotal ?? 0,
    latestActivityAt: latest?.session.ended_at ?? null,
  };
  return { family: detail.family, children: [child] };
}
