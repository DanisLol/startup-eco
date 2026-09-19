import type { LessonStats } from "@/lib/types";

/**
 * Post-exit screen listing what the child finished. Rendered from stored stats.
 */
export function DoneView({ stats }: { stats: LessonStats }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-8">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">
        See you next time
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
        {stats.childName} hopped {stats.stepsCompleted} of {stats.stepsTotal}
      </h1>
      <p className="mt-3 text-lg text-stone">
        {stats.minutesElapsed} minute{stats.minutesElapsed === 1 ? "" : "s"} on{" "}
        {stats.lessonTitle}. Your grown-up got a text about it.
      </p>

      <ul className="mt-8 grid gap-3">
        {stats.completedTitles.length === 0 ? (
          <li className="rounded-[24px] bg-sand px-5 py-4 text-lg text-deep">
            You opened the lesson. That is a start.
          </li>
        ) : (
          stats.completedTitles.map((title) => (
            <li
              key={title}
              className="rounded-[24px] bg-foam px-5 py-4 text-lg text-deep shadow-[0_6px_0_rgba(76,93,107,0.12)]"
            >
              {title}
            </li>
          ))
        )}
      </ul>

      {stats.reflection ? (
        <div className="mt-6 rounded-[24px] bg-sand p-5">
          <p className="text-base font-semibold uppercase tracking-wide text-stone">
            You said
          </p>
          <p className="mt-2 text-lg text-deep">{stats.reflection}</p>
        </div>
      ) : null}

      {stats.quizzesAttempted > 0 ? (
        <p className="mt-6 text-lg text-deep">
          Quiz stones: {stats.quizzesCorrect} of {stats.quizzesAttempted} right.
        </p>
      ) : null}
    </div>
  );
}
