# Rules.md — 4-Person Split

Each person owns a coherent slice of the spec (sections in parentheses). Section 1 (Product Purpose) and 29 (Core Product Principle) are shared by everyone — read them first.

---

## Person 1 — Parent Experience & Curriculum
**Owns the parent-facing side: input, curriculum structure, reports.**
Sections: 2.1, 3, 4, 15, 16

- Learning-goal intake → structured curriculum/index with stable topic IDs, ordering, objectives (3, 4)
- Personalization context capture ("my child likes Naruto") stored as reusable context, not prompts (3.2)
- Daily parent report generator (15)
- Natural-language parent Q&A over learning data — distinguish observed data from recommendations (16)
- Coordinate with Person 4: curriculum/version IDs must match the persistence schema (4 ↔ 17)

---

## Person 2 — Artifact Generation Engine
**Owns how artifacts get produced: prompting, stages, versioning, reliability.**
Sections: 5, 6, 7, 19, 20, 18, 27, 28

- Artifact generator: goals → self-contained interactive web artifact (5, 6)
- Seven-stage learning framework (Discover → Master) and stage selection logic (7)
- Generation prompt template: role/task/context/requirements/output (19, 20)
- Artifact versioning scheme (artifact-jupiter-v1 → v2) with historical traceability (18)
- Reliability validation: answer keys, factual checks, age appropriateness (27)
- Failure handling: fallbacks, regeneration, never erase progress (28)
- Coordinate with Person 3: output must satisfy the required component list (5, 6 ↔ 8)

---

## Person 3 — Child Experience & Content Quality
**Owns what the child actually sees and feels.**
Sections: 2.2, 8, 11, 12, 13, 23, 24, 25

- Artifact rendering: intro, visuals, animations, flashcards, practice, quiz, feedback, review components (8)
- Personalization in content: interest-based analogies/themes without copyrighted material (11)
- Age/reading-level adaptation rules (12)
- Child safety defaults: content filters, no manipulative engagement, no emotional dependency (13)
- Gamification policy: optional, learning-first (23)
- Accessibility checklist: contrast, keyboard, reduced motion, touch (24)
- Visual design system: consistent app shell, per-topic identity (25)
- Coordinate with Person 2: define the component contract the generator outputs into (8 ↔ 5)

---

## Person 4 — Learning Data & Platform
**Owns events, progress, mastery, and the system glue.**
Sections: 9, 10, 17, 21, 22, 26

- Progress event model: structured, educationally meaningful events (21)
- Persistence: artifact/topic/objective state, answers, attempts, scores (17)
- Adaptive learning signals: multi-signal progress, never time-alone (9)
- Spaced review scheduler (10)
- Mastery estimation beyond single quiz scores (22)
- Technical architecture: separate generation, rendering, event collection, progress calc, reporting (26)
- Coordinate with Person 1: report data source; with Person 2: event contract

---

## Cross-cutting (everyone)
- 1 — Product purpose and core experience
- 29 — Optimize for learning effectiveness, not impressive AI output
- 30 — Definition of Done checklist applies to every artifact

## Integration points to agree on early
1. ID schema: curriculum_id / topic_id / artifact_id / version — Person 1 & 4
2. Event contract between generated artifacts and the event collector — Person 2, 3 & 4
3. Component library API the generator targets — Person 2 & 3
4. Safety/validation gate before an artifact is shown to a child — Person 2 & 3
