# Person 4 — Learning Data & Platform

Platform slice of the [rules.md](../../rules.md) spec: learning-event model, event
collection, progress/mastery computation, spaced review, and persistence.

Owns spec sections **9** (Adaptive Learning), **10** (Spaced Review),
**17** (Artifact State & Progress Persistence), **21** (Progress Event Model),
**22** (Mastery), **26** (Technical Architecture Principles).

## Layout

```
src/person4/
  types.ts        # domain model: IDs, events, progress, mastery (shared contracts)
  collector.ts    # learning-event collector with queue + flush + fallback
  store.ts        # persistence: session/answers/attempts/scores + adapters
  progress.ts     # multi-signal progress calculation engine
  mastery.ts      # mastery estimator (never a single quiz score)
  review.ts       # spaced review scheduler
  index.ts        # public API for the rest of the app
tests/
  person4.test.ts # unit tests
```

## Principles (from the spec)

- Events are structured and educationally meaningful (§21) — not page analytics.
- Progress is computed from **multiple signals**; time spent alone is never
  treated as proof of learning (§9).
- Mastery is estimated from accuracy, attempts, difficulty, independence,
  hint usage, activity variety, delayed recall, and transfer (§22).
- Review is adaptive: forgotten items resurface, mastered items are skipped (§10).
- Persistence keeps artifact/topic IDs, versions, objectives, and history;
  regeneration never erases progress (§17).
- The UI never calculates long-term progress — it only emits events (§26).
