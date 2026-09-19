"use client";

/**
 * Renders an explain step: a title and a few short paragraphs.
 */
export function ExplainStep({
  title,
  paragraphs,
  onContinue,
}: {
  title: string;
  paragraphs: string[];
  onContinue: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col">
      <div className="rounded-[32px] bg-sand p-6 shadow-[0_10px_0_rgba(76,93,107,0.18)]">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight text-deep">
          {title}
        </h1>
        <div className="mt-5 space-y-4 text-lg text-deep">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-auto rounded-full bg-deep px-6 py-4 text-xl font-semibold text-foam"
      >
        Next stone
      </button>
    </section>
  );
}
