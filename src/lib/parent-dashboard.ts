import { createSupabaseServerClient } from "./supabase/server";
import { computeStats, describeActivity, normalizeProgress } from "./stats";
import { hasSupabaseServerConfig } from "./supabase/config";
import type {
  Child,
  ChildSummary,
  DashboardData,
  Family,
  Lesson,
  ParentHomeData,
  ParentUpdate,
  Session,
} from "./types";

function hasSupabaseAuthConfig() {
  return hasSupabaseServerConfig();
}

export function isParentDashboardSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42703" || candidate.code === "42P01" || /parent_user_id|parent_updates|children/i.test(candidate.message ?? "");
}

async function getCurrentParentFamily(): Promise<{ userId: string; family: Family } | null> {
  if (!hasSupabaseAuthConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("parent_user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? { userId: auth.user.id, family: data as Family } : null;
}

export async function getAuthenticatedParent() {
  if (!hasSupabaseAuthConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Returns every child linked to the authenticated parent's family. */
export async function getParentHomeData(): Promise<ParentHomeData | null> {
  const current = await getCurrentParentFamily();
  if (!current) return null;
  const supabase = await createSupabaseServerClient();
  const { data: childRows, error } = await supabase
    .from("children")
    .select("*")
    .eq("family_id", current.family.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const children = (childRows ?? []) as Child[];
  if (children.length === 0) return { family: current.family, children: [] };

  const { data: lessonRows, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("family_id", current.family.id)
    .in("child_id", children.map((child) => child.id))
    .order("created_at", { ascending: false });
  if (lessonError) throw lessonError;
  const lessons = (lessonRows ?? []) as Lesson[];
  const lessonIds = lessons.map((lesson) => lesson.id);
  const { data: sessionRows, error: sessionError } = lessonIds.length
    ? await supabase.from("sessions").select("*").in("lesson_id", lessonIds).not("ended_at", "is", null).order("ended_at", { ascending: false })
    : { data: [], error: null };
  if (sessionError) throw sessionError;

  const lessonsByChild = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const list = lessonsByChild.get(lesson.child_id ?? "") ?? [];
    list.push(lesson);
    lessonsByChild.set(lesson.child_id ?? "", list);
  }
  const sessionsByLesson = new Map<string, Session[]>();
  for (const session of (sessionRows ?? []) as Session[]) {
    const list = sessionsByLesson.get(session.lesson_id) ?? [];
    list.push(session);
    sessionsByLesson.set(session.lesson_id, list);
  }

  const summaries: ChildSummary[] = children.map((child) => {
    const childLessons = lessonsByChild.get(child.id) ?? [];
    const childSessions = childLessons.flatMap((lesson) => sessionsByLesson.get(lesson.id) ?? []);
    const latestSession = childSessions[0];
    const latestLesson = latestSession ? childLessons.find((lesson) => lesson.id === latestSession.lesson_id) : childLessons[0];
    const latestStats = latestSession && latestLesson?.artifact
      ? computeStats({ childName: child.name, artifact: latestLesson.artifact, progress: normalizeProgress(latestSession.progress), startedAt: latestSession.started_at, endedAt: latestSession.ended_at ?? undefined })
      : null;
    return {
      ...child,
      currentTopic: latestLesson?.topic ?? null,
      sessionsCompleted: childSessions.length,
      stepsCompleted: latestStats?.stepsCompleted ?? 0,
      stepsTotal: latestStats?.stepsTotal ?? 0,
      latestActivityAt: latestSession?.ended_at ?? null,
    };
  });

  return { family: current.family, children: summaries };
}

/** Returns one child's full progress view after confirming parent ownership. */
export async function getParentChildDashboardData(childId: string): Promise<DashboardData | null> {
  const current = await getCurrentParentFamily();
  if (!current) return null;
  const supabase = await createSupabaseServerClient();
  const { data: childRow, error: childError } = await supabase.from("children").select("*").eq("id", childId).eq("family_id", current.family.id).maybeSingle();
  if (childError) throw childError;
  if (!childRow) return null;
  const child = childRow as Child;

  const { data: lessonRows, error: lessonError } = await supabase.from("lessons").select("*").eq("family_id", current.family.id).eq("child_id", child.id).order("created_at", { ascending: false });
  if (lessonError) throw lessonError;
  const lessons = (lessonRows ?? []) as Lesson[];
  const lessonIds = lessons.map((lesson) => lesson.id);
  const { data: sessionRows, error: sessionError } = lessonIds.length
    ? await supabase.from("sessions").select("*").in("lesson_id", lessonIds).not("ended_at", "is", null).order("ended_at", { ascending: false })
    : { data: [], error: null };
  if (sessionError) throw sessionError;

  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const sessions = ((sessionRows ?? []) as Session[]).map((session) => {
    const lesson = lessonById.get(session.lesson_id);
    if (!lesson?.artifact) return null;
    const progress = normalizeProgress(session.progress);
    return {
      session: { ...session, progress },
      lesson,
      stats: computeStats({ childName: child.name, artifact: lesson.artifact, progress, startedAt: session.started_at, endedAt: session.ended_at ?? undefined }),
      activity: describeActivity({ artifact: lesson.artifact, progress }),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const sessionIds = sessions.map((item) => item.session.id);
  const { data: updateRows, error: updateError } = sessionIds.length
    ? await supabase.from("parent_updates").select("*").in("session_id", sessionIds).order("created_at", { ascending: false }).limit(20)
    : { data: [], error: null };
  if (updateError) throw updateError;

  return { family: current.family, child, lesson: lessons[0] ?? null, sessions, updates: (updateRows ?? []) as ParentUpdate[] };
}

/** Kept as a compatibility alias for callers that used the original dashboard query. */
export async function getParentDashboardData(): Promise<DashboardData | null> {
  const home = await getParentHomeData();
  const child = home?.children[0];
  return child ? getParentChildDashboardData(child.id) : null;
}
