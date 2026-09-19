import Link from "next/link";
import { redirect } from "next/navigation";
import { DoneView } from "@/components/DoneView";
import {
  getFamilyById,
  getLatestEndedSessionForFamily,
} from "@/lib/db";
import { getJoinCookies } from "@/lib/join-cookies";
import { computeStats } from "@/lib/stats";

/**
 * Shows what the child finished, using stored progress rather than waiting on SMS.
 */
export default async function DonePage() {
  const { familyId, childName } = await getJoinCookies();
  if (!familyId || !childName) redirect("/join");

  const family = await getFamilyById(familyId);
  if (!family) redirect("/join");

  const ended = await getLatestEndedSessionForFamily(family.id);
  if (!ended?.lesson.artifact) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
          See you next time
        </h1>
        <p className="mt-4 text-lg text-stone">
          Whenever you want another hop, come back with your family code.
        </p>
        <Link
          href="/learn"
          className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-deep px-6 py-4 text-xl font-semibold text-foam"
        >
          Back to the stones
        </Link>
      </main>
    );
  }

  const stats = computeStats({
    childName: family.child_name,
    artifact: ended.lesson.artifact,
    progress: ended.session.progress,
    startedAt: ended.session.started_at,
    endedAt: ended.session.ended_at ?? undefined,
  });

  return <DoneView stats={stats} />;
}
