import type { LearnerContext } from "@eco/contracts";
import type { ChildRow, PersonalizationRow } from "@eco/db";

/** Build the minimal learner context generators are allowed to see. */
export function learnerContextFrom(child: ChildRow, context: PersonalizationRow[]): LearnerContext {
  const active = context.filter((c) => c.active);
  return {
    displayName: child.display_name,
    age: child.age,
    readingLevel: child.reading_level,
    interests: active.filter((c) => c.kind === "interest").map((c) => c.value).slice(0, 10),
    notes: active.filter((c) => c.kind !== "interest").map((c) => c.value).slice(0, 10),
  };
}
