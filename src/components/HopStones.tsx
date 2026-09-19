"use client";

/**
 * Draws the hop-stone trail for the current lesson step.
 */
export function HopStones({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <ol className="flex items-end justify-center gap-2" aria-label="Lesson steps">
      {Array.from({ length: total }, (_, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li key={index}>
            <span
              className={`block rounded-full transition-transform ${
                active
                  ? "h-7 w-11 bg-deep shadow-[0_6px_0_#0f1f26] -translate-y-1"
                  : done
                    ? "h-5 w-8 bg-leaf"
                    : "h-5 w-8 bg-stone/30"
              }`}
            />
            <span className="sr-only">
              Step {index + 1}
              {active ? ", current" : done ? ", done" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
