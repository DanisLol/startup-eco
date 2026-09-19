import { redirect } from "next/navigation";
import { GeneratingWait } from "@/components/GeneratingWait";
import { LessonPlayer } from "@/components/LessonPlayer";
import {
  getFamilyById,
  getLesson,
  openOrResumeSession,
} from "@/lib/db";
import { getJoinCookies } from "@/lib/join-cookies";

/**
 * Plays one lesson, one step at a time.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const { familyId, childName } = await getJoinCookies();
  if (!familyId || !childName) redirect("/join");

  const family = await getFamilyById(familyId);
  if (!family) redirect("/join");

  const lesson = await getLesson(lessonId);
  if (!lesson || lesson.family_id !== family.id) redirect("/learn");

  if (lesson.status === "generating") {
    return <GeneratingWait childName={family.child_name} />;
  }

  if (lesson.status === "failed" || !lesson.artifact) {
    redirect("/learn");
  }

  const session = await openOrResumeSession(lesson.id);

  return (
    <LessonPlayer
      childName={family.child_name}
      sessionId={session.id}
      artifact={lesson.artifact}
      initialProgress={session.progress}
    />
  );
}
