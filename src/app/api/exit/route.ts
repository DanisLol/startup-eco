import { writeDebrief } from "@/lib/ai/debrief";
import {
  closeSession,
  createParentUpdate,
  getFamilyById,
  getLesson,
  getParentUpdateForSession,
  getSession,
  updateParentSmsStatus,
} from "@/lib/db";
import { computeStats } from "@/lib/stats";
import { sendSms } from "@/lib/twilio";

/**
 * Closes a lesson session, persists one canonical parent update, and sends
 * that exact message by SMS. The dashboard reads the same stored message.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string };
  if (!body.sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });

  const session = await getSession(body.sessionId);
  if (!session) return Response.json({ error: "session not found" }, { status: 404 });

  const lesson = await getLesson(session.lesson_id);
  if (!lesson?.artifact) return Response.json({ error: "lesson not ready" }, { status: 409 });

  const family = await getFamilyById(lesson.family_id);
  if (!family) return Response.json({ error: "family not found" }, { status: 404 });

  const stats = computeStats({
    childName: family.child_name,
    artifact: lesson.artifact,
    progress: session.progress,
    startedAt: session.started_at,
  });

  const existing = await getParentUpdateForSession(session.id);
  if (existing) return Response.json({ stats });

  const debrief = await writeDebrief(stats);
  await closeSession(session.id, debrief);
  const update = await createParentUpdate({
    family_id: family.id,
    session_id: session.id,
    lesson_id: lesson.id,
    message_body: debrief,
    observed_stats: stats,
    suggested_next_steps: stats.stoppedEarly ? ["Return to finish the lesson when ready."] : [],
  });

  try {
    const result = await sendSms(family.phone, update.message_body);
    await updateParentSmsStatus({ updateId: update.id, status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS delivery failed";
    console.error("debrief SMS failed", error);
    await updateParentSmsStatus({ updateId: update.id, status: "failed", error: message });
  }

  return Response.json({ stats });
}
