import { redirect } from "next/navigation";
import { GeneratingWait } from "@/components/GeneratingWait";
import { Roadmap } from "@/components/Roadmap";
import { getFamilyById, getLatestLessonForFamily } from "@/lib/db";
import { getJoinCookies } from "@/lib/join-cookies";

/**
 * Lesson map for the signed-in child. Lesson 1 is playable; the rest are coming next.
 */
export default async function LearnPage() {
  const { familyId, childName } = await getJoinCookies();
  if (!familyId || !childName) redirect("/join");

  const family = await getFamilyById(familyId);
  if (!family) redirect("/join");

  const lesson = await getLatestLessonForFamily(family.id);
  if (!lesson) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
          No stones yet
        </h1>
        <p className="mt-4 text-lg text-stone">
          Ask your grown-up to text the number. Then hop back here.
        </p>
      </main>
    );
  }

  if (lesson.status === "generating") {
    return <GeneratingWait childName={family.child_name} />;
  }

  if (lesson.status === "failed") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
          This hop could not be built
        </h1>
        <p className="mt-4 text-lg text-stone">
          Ask your grown-up to text again. Try a short topic, like dinosaurs or
          volcanoes.
        </p>
      </main>
    );
  }

  return (
    <Roadmap
      childName={family.child_name}
      titles={lesson.roadmap ?? [lesson.artifact?.lessonTitle ?? "Lesson 1"]}
      lessonId={lesson.id}
      ready
    />
  );
}
