import { saveProgress } from "@/lib/db";

/**
 * Merges a step completion into the session progress blob.
 * The client does not wait on this and does not retry.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    stepId?: string;
    answer?: { choice: number; correct: boolean };
    reflection?: string;
  };

  if (!body.sessionId || !body.stepId) {
    return Response.json({ error: "sessionId and stepId required" }, { status: 400 });
  }

  const progress = await saveProgress({
    sessionId: body.sessionId,
    stepId: body.stepId,
    answer: body.answer,
    reflection: body.reflection,
  });

  if (!progress) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
