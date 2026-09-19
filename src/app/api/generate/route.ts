import { generateLesson } from "@/lib/ai/lesson";
import { publicAppUrl } from "@/lib/app-url";
import {
  getFamilyById,
  getLesson,
  updateLessonGeneration,
} from "@/lib/db";
import {
  FIXTURE_ROADMAP,
  fixtureArtifact,
} from "@/lib/fixture";
import { sendSms } from "@/lib/twilio";

export const maxDuration = 60;

/**
 * Generates a lesson artifact, then texts the parent a join code.
 */
export async function POST(req: Request) {
  const { lessonId } = (await req.json()) as { lessonId?: string };
  if (!lessonId) {
    return Response.json({ error: "lessonId required" }, { status: 400 });
  }

  const lesson = await getLesson(lessonId);
  if (!lesson) {
    return Response.json({ error: "lesson not found" }, { status: 404 });
  }

  const family = await getFamilyById(lesson.family_id);
  if (!family) {
    return Response.json({ error: "family not found" }, { status: 404 });
  }

  try {
    const generated = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? await generateLesson({
          childName: family.child_name,
          age: family.child_age,
          topic: lesson.topic,
        })
      : { artifact: fixtureArtifact, roadmap: FIXTURE_ROADMAP };

    await updateLessonGeneration(lessonId, {
      status: "ready",
      artifact: generated.artifact,
      roadmap: generated.roadmap,
    });

    const joinUrl = `${publicAppUrl(req)}/join`;
    await sendSms(
      family.phone,
      `Ready. Code ${family.code} at ${joinUrl}`,
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("lesson generation failed", error);
    await updateLessonGeneration(lessonId, { status: "failed" });
    await sendSms(
      family.phone,
      "Sorry, I could not build that lesson. Try texting again like: Mia is 7, she loves volcanoes",
    );
    return Response.json({ ok: false }, { status: 500 });
  }
}
