import "server-only";
import { generateReportText, type Tier } from "@eco/ai";
import type { ChildRow, DailyReportRow } from "@eco/db";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Daily parent report (rules.md section 15). All numbers are computed here
 * from events and progress; the model only phrases them.
 */

export interface DailyStats {
  date: string;
  topicsOpened: string[];
  topicsCompleted: string[];
  needsReview: string[];
  questionsAnswered: number;
  questionsCorrect: number;
  firstAttemptCorrect: number;
  hintsUsed: number;
  itemsExplored: number;
  minutesActive: number;
  strengths: string[];
  struggles: string[];
  suggestedNext: string | null;
}

function dayBounds(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function computeDailyStats(childId: string, date: string): Promise<DailyStats> {
  const db = createServiceClient();
  const { start, end } = dayBounds(date);

  const [{ data: events }, { data: responses }, { data: sessions }, { data: progress }] = await Promise.all([
    db.from("learning_events").select("type, topic_id, payload, occurred_at").eq("child_id", childId).gte("occurred_at", start).lt("occurred_at", end),
    db.from("responses").select("topic_id, correct, attempt, hints_used, objective_codes, question_id").eq("child_id", childId).gte("occurred_at", start).lt("occurred_at", end),
    db.from("artifact_sessions").select("started_at, last_event_at").eq("child_id", childId).gte("started_at", start).lt("started_at", end),
    db.from("topic_progress").select("topic_id, status, completed_at, weak_objective_codes, last_activity_at, topics!inner(title, position, curriculum_id)").eq("child_id", childId),
  ]);

  type Ev = { type: string; topic_id: string; payload: Record<string, unknown>; occurred_at: string };
  type Resp = { topic_id: string; correct: boolean; attempt: number; hints_used: number; objective_codes: string[]; question_id: string };
  type Prog = { topic_id: string; status: string; completed_at: string | null; weak_objective_codes: string[]; last_activity_at: string | null; topics: { title: string; position: number; curriculum_id: string } };

  const evs = (events ?? []) as Ev[];
  const resps = (responses ?? []) as Resp[];
  const progs = (progress ?? []) as unknown as Prog[];
  const titleByTopic = new Map(progs.map((p) => [p.topic_id, p.topics.title]));

  const openedIds = [...new Set(evs.filter((e) => e.type === "topic_opened" || e.type === "lesson_started").map((e) => e.topic_id))];
  const missingTitles = openedIds.filter((id) => !titleByTopic.has(id));
  if (missingTitles.length) {
    const { data: t } = await db.from("topics").select("id, title").in("id", missingTitles);
    for (const row of t ?? []) titleByTopic.set(row.id as string, row.title as string);
  }

  const completedToday = progs.filter((p) => p.completed_at && p.completed_at >= start && p.completed_at < end).map((p) => p.topics.title);
  const needsReview = progs.filter((p) => p.status === "needs_review").map((p) => p.topics.title);

  // Per-question first-attempt correctness (a retry that lands is not "first attempt correct").
  const firstAttempts = new Map<string, boolean>();
  for (const r of resps) {
    const key = `${r.topic_id}:${r.question_id}`;
    if (r.attempt === 1 && !firstAttempts.has(key)) firstAttempts.set(key, r.correct);
  }

  const minutes = (sessions ?? []).reduce((sum, s) => {
    const a = new Date(s.started_at as string).getTime();
    const b = s.last_event_at ? new Date(s.last_event_at as string).getTime() : a;
    return sum + Math.min(60, Math.max(0, (b - a) / 60_000));
  }, 0);

  // Strengths / struggles by topic: accuracy over at least 2 responses.
  const byTopic = new Map<string, { c: number; n: number }>();
  for (const r of resps) {
    const t = byTopic.get(r.topic_id) ?? { c: 0, n: 0 };
    t.n++;
    if (r.correct) t.c++;
    byTopic.set(r.topic_id, t);
  }
  const strengths: string[] = [];
  const struggles: string[] = [];
  for (const [topicId, { c, n }] of byTopic) {
    const title = titleByTopic.get(topicId) ?? "a topic";
    if (n >= 2 && c / n >= 0.8) strengths.push(`${title}: ${c} of ${n} correct`);
    if (n >= 2 && c / n < 0.5) struggles.push(`${title}: ${c} of ${n} correct`);
  }

  const nextTopic = progs
    .filter((p) => p.status === "in_progress")
    .sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""))[0];
  const suggestedNext = needsReview[0]
    ? `Review "${needsReview[0]}" briefly before moving on.`
    : nextTopic
      ? `Continue "${nextTopic.topics.title}".`
      : null;

  return {
    date,
    topicsOpened: openedIds.map((id) => titleByTopic.get(id) ?? "Untitled topic"),
    topicsCompleted: completedToday,
    needsReview,
    questionsAnswered: resps.length,
    questionsCorrect: resps.filter((r) => r.correct).length,
    firstAttemptCorrect: [...firstAttempts.values()].filter(Boolean).length,
    hintsUsed: evs.filter((e) => e.type === "hint_requested").length,
    itemsExplored: evs.filter((e) => e.type === "item_explored").length,
    minutesActive: Math.round(minutes),
    strengths,
    struggles,
    suggestedNext,
  };
}

export async function buildDailyReport(childId: string, date: string): Promise<DailyReportRow> {
  const db = createServiceClient();
  const [{ data: child }, { data: parentRow }] = await Promise.all([
    db.from("children").select("*").eq("id", childId).single(),
    db.from("children").select("parents!inner(tier)").eq("id", childId).single(),
  ]);
  if (!child) throw new Error("child not found");
  const tier = (((parentRow as { parents?: { tier?: Tier } } | null)?.parents?.tier) ?? "free") as Tier;
  const stats = await computeDailyStats(childId, date);
  const { text } = await generateReportText({ childName: (child as ChildRow).display_name, stats: stats as unknown as Record<string, unknown>, tier });
  const { data, error } = await db
    .from("daily_reports")
    .upsert({ child_id: childId, report_date: date, stats, summary: text }, { onConflict: "child_id,report_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyReportRow;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
