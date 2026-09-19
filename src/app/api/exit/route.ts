import { writeDebrief } from "@/lib/ai/debrief";
import {
  closeSession,
  getFamilyById,
  getLesson,
  getSession,
} from "@/lib/db";
import { computeStats } from "@/lib/stats";
import { sendSms } from "@/lib/twilio";

/**
 * Closes a lesson session, texts the parent a debrief, and returns stats
 * for the child's /done screen so the UI never waits on the model.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await getSession(body.sessionId);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const lesson = await getLesson(session.lesson_id);
  if (!lesson?.artifact) {
    return Response.json({ error: "lesson not ready" }, { status: 409 });
  }

  const family = await getFamilyById(lesson.family_id);
  if (!family) {
    return Response.json({ error: "family not found" }, { status: 404 });
  }

  const stats = computeStats({
    childName: family.child_name,
    artifact: lesson.artifact,
    progress: session.progress,
    startedAt: session.started_at,
  });

  const debrief = await writeDebrief(stats);
  await closeSession(session.id, debrief);

  try {
    await sendSms(family.phone, debrief);
  } catch (error) {
    console.error("debrief SMS failed", error);
  }

  return Response.json({ stats });
}
