import Link from "next/link";

/**
 * Shows the generated roadmap with only lesson 1 playable.
 */
export function Roadmap({
  childName,
  titles,
  lessonId,
  ready,
}: {
  childName: string;
  titles: string[];
  lessonId: string;
  ready: boolean;
}) {
  const [first, ...rest] = titles.length > 0 ? titles : ["Your first lesson"];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-8">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">
        {childName}&apos;s creek
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
        Stones for today
      </h1>
      <p className="mt-3 text-lg text-stone">
        Hop the first stone now. The rest are waiting for another day.
      </p>

      <ol className="mt-8 grid gap-3">
        <li>
          {ready ? (
            <Link
              href={`/learn/${lessonId}`}
              className="flex min-h-16 items-center rounded-[24px] bg-deep px-5 py-4 text-xl font-semibold text-foam"
            >
              {first}
            </Link>
          ) : (
            <div className="rounded-[24px] bg-deep px-5 py-4 text-xl font-semibold text-foam">
              {first}
            </div>
          )}
        </li>
        {rest.map((title) => (
          <li
            key={title}
            className="rounded-[24px] bg-foam/70 px-5 py-4 text-lg text-stone"
          >
            {title}
            <span className="mt-1 block text-base">Coming next</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
