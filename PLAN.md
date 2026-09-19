---
name: AI Learning App — 4-Hour Hackathon Build
overview: Single Next.js 16 app, 4 Supabase tables. AI generates a lesson blueprint that React always renders, plus one bespoke interactive widget per topic sandboxed in a srcdoc iframe. Demoed from localhost. Scoped for 4 people x 4 hours.
todos:
  - id: foundation
    content: "T+0:00-0:20 BLOCKING — create-next-app + deps (ai, @ai-sdk/anthropic, zod, @supabase/supabase-js, vitest) pushed to main; lib/contracts.ts; Supabase project + schema.sql; .env.local shared to all 4"
    status: pending
  - id: renderer
    content: "T+0:20-1:15 — components/Renderer with exactly 3 primitives (Content, Cards, Questions) plus a WidgetSlot; draws any blueprint; this is the lesson, not a fallback"
    status: pending
  - id: curriculum
    content: "T+0:20-1:00 — POST /api/curriculum: generateObject, parent goal to topics with objectives; goal intake UI; curriculum map with mastery"
    status: pending
  - id: events-mastery
    content: "T+0:20-1:30 — POST /api/events: Zod, dedupe on client_event_id, server re-grade via pure grade(), insert; lib/mastery.ts; one Vitest file; /debug page"
    status: pending
  - id: blueprint-gen
    content: "T+0:20-1:15 — phase 1: generateObject over BlueprintSchema; claim row via INSERT ON CONFLICT DO NOTHING; return blueprint immediately"
    status: pending
  - id: widget-gen
    content: "T+1:15-2:15 — phase 2 via after(): generate one ~150-line self-contained widget per explore activity; static smoke check; store in artifacts.widgets"
    status: pending
  - id: widget-frame
    content: "T+1:15-2:15 — WidgetFrame: host-built srcdoc with host-injected CSP and inlined LearnKit (2 functions), sandbox=allow-scripts, event.source check, 3s ready-ping fallback"
    status: pending
  - id: parent-report
    content: "T+1:30-2:30 — GET /api/report: one aggregate query then LLM prose over the numbers only; POST /api/ask read-only Q&A, no tool calling"
    status: pending
  - id: seed
    content: "T+2:00-2:20 — seed script: one fully generated backup curriculum + a day of events. INSURANCE, not polish. Runs as soon as generation works once."
    status: pending
  - id: integrate-rehearse
    content: "T+2:30-3:45 — P4 owns integration on the demo laptop; polish, empty states, router.refresh on mastery; T+3:15 hard freeze; fresh-clone smoke run; rehearse twice"
    status: pending
isProject: false
---

# AI Learning App — 4-Hour Hackathon Build

Greenfield. Spec is [rules.md](rules.md); ownership is [team-split.md](team-split.md).

**Constraint that shapes everything: 4 people, 4 hours, demoed from localhost.** Integration
is the bottleneck, not typing. Every trade below is written down rather than assumed.

**Next.js 16.3.5** is what's in `node_modules`. Per [AGENTS.md](AGENTS.md), read
`node_modules/next/dist/docs/` before writing framework code — this version differs from
what most training data assumes.

## The core idea: blueprint renders, AI writes the centerpiece

Generation is two-phase, and the phases have very different jobs.

1. **Blueprint** (~15s) — structured JSON: objectives, activities, every question with its
   answer key and corrective feedback. Zod-validated, stored in Postgres. **React renders
   this directly.** It is the lesson, not a fallback.
2. **Widget** (~15s, after the response) — for each `explore` activity, the model writes one
   small self-contained HTML/JS interactive (~150 lines): the animated orbit, the fraction
   slider. It runs in a sandboxed iframe embedded in the React lesson.

We are not asking a model to write a whole application. The structure of a good lesson is
the same every time and our code knows it; only the bespoke visualization is worth
generating. That cuts latency roughly sixfold and removes most of the failure surface.

**The consequence that matters most:** questions, flashcards, and grading live in React, so
**no question IDs ever cross the iframe boundary.** The generated widget cannot corrupt
assessment data because it never touches it. It emits interaction events and nothing else.

**Honest limitation.** Server re-grading validates *consistency*, not *correctness*. We cut
the second-model fact-check pass, so a confidently wrong answer key stays wrong. That is a
real spec section 27 gap, accepted for a 4-hour clock.

## Architecture

```
  ONE Next.js 16 app, ONE Supabase project, localhost demo
  +---------------------------------------------------------------+
  |  /                /curriculum/[id]      /learn/[topicId]       |
  |  goal intake      topic map +           <Renderer blueprint>   |
  |  /parent          mastery rings         +--------------------+ |
  |  summary + Q&A                          | Content            | |
  |                                         | Cards              | |
  |                                         | Questions  <-- all | |
  |                                         |   grading is here  | |
  |                                         | WidgetSlot         | |
  |                                         |  +---------------+ | |
  |                                         |  | iframe srcdoc | | |
  |                                         |  | sandbox=      | | |
  |                                         |  | "allow-       | | |
  |                                         |  |  scripts"     | | |
  |                                         |  | generated     | | |
  |                                         |  | widget only   | | |
  |                                         |  +-------+-------+ | |
  |                                         +----------|---------+ |
  |                                     postMessage: ready, event  |
  +--------------------------+------------------------------------+
                             | fetch
  +--------------------------v------------------------------------+
  |  POST /api/curriculum      goal      -> topics                 |
  |  POST /api/artifact/[id]   blueprint -> returns; after() widget|
  |  GET  /api/artifact/[id]   poll for widgets                    |
  |  POST /api/events          grade + insert                      |
  |  GET  /api/report          SQL -> LLM prose                    |
  |  POST /api/ask             read-only Q&A                       |
  +--------------------------+------------------------------------+
                             | supabase-js, SERVICE ROLE, server only
  +--------------------------v------------------------------------+
  |  Supabase Postgres: 4 tables, no auth, no RLS                  |
  +----------------------------------------------------------------+
```

Everything depends on `lib/contracts.ts`. That is the only coupling point and it is
deliberate: it is the four-way team contract.

**Phase 2 runs in `after()`, not a floating promise.** `after` is a stable export of
`next/server` in Next 16.3.5 (verified in `node_modules/next/dist/server/after/`). It runs
the callback after the response is sent, works in Route Handlers, and still runs if the
handler threw. Locally there is no `maxDuration` cap, so widget generation has as long as it
needs. A bare unawaited promise would risk an unhandled rejection or an HMR restart leaving
the row stuck in `generating` forever.

## Artifact lifecycle

```
  child opens topic
        |
        v
  INSERT INTO artifacts (topic_id, version, status)
    VALUES ($1, 1, 'generating')
    ON CONFLICT (topic_id, version) DO NOTHING
    RETURNING id
        |
   got a row?                         no row -> someone else is generating,
        | yes                                  or it already exists: GET and poll
        v
  phase 1: generateObject -> blueprint
        |                                --fail--> status='failed', error jsonb
        v                                          no blueprint: "couldn't build this
  store blueprint, RETURN it                       lesson" + Retry (inserts version+1)
  client renders <Renderer> NOW
        |
        v
  after(() => generate widgets)
        |
        v
  smokeCheck(html) per widget  --fail--> skip that widget; WidgetSlot shows a
        |                                static caption. Lesson is unaffected.
        v
  artifacts.widgets = { activityId: html }, status='ready'
  client polls, swaps placeholders for iframes
```

A failed widget costs you one visual. A failed blueprint costs you the topic. Only the
second needs a retry path, and retry inserts **version + 1** — a failed version 1 row
occupies `unique (topic_id, version)` and cannot be reclaimed.

## Sandbox and safety

The widget is untrusted model-written JavaScript shown to a child. Four rules.

1. **`<iframe sandbox="allow-scripts">` with NO `allow-same-origin`.** Opaque origin: the
   frame cannot read app cookies, `localStorage`, or parent DOM. Adding `allow-same-origin`
   next to `allow-scripts` effectively voids the sandbox, because the frame can then reach
   the parent and strip its own sandbox attribute.
2. **The host builds the srcdoc string. The model never writes the document shell.** The
   host emits, in this order: `<!DOCTYPE html>`, the CSP `<meta>`, the inlined LearnKit
   constant, then the model's markup. A CSP tag the model places anywhere restricts nothing
   parsed before it, so this ordering is the control, not a formality.
   CSP: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:`
3. **LearnKit is a server-side string constant, inlined.** Not `public/learnkit.js`. Under
   `script-src 'unsafe-inline'` an external `<script src>` is blocked, and an opaque-origin
   frame cannot fetch same-origin assets anyway.
4. **On every message: `event.source === iframe.contentWindow`, then validate against a Zod
   schema.** The source check proves which frame sent it, not that the payload is honest.
   The host already knows which topic and artifact it rendered, so **bind those IDs
   server-side** and ignore any the widget sends.

The CSP is what actually prevents exfiltration. The static check below is a smoke test that
catches sloppy generation early, not a security boundary — a regex will never enumerate
`sendBeacon`, WebSocket, EventSource, and computed property access.

**Never prefix `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`.**
That is how the key ends up in the client bundle at hour three.

## Data model — 4 tables

```sql
create table curricula (
  id         uuid primary key default gen_random_uuid(),
  parent_id  text not null default 'demo-parent',   -- unused; makes auth a non-migration
  title      text not null,
  goal       text not null,
  child_name text,
  child_age  int,
  interests  text[] default '{}',
  created_at timestamptz default now()
);

create table topics (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  slug          text not null,                      -- 'jupiter', readable, NOT the pk
  title         text not null,
  description   text,
  position      int  not null,
  objectives    jsonb not null default '[]',        -- [{ id, text }]
  created_at    timestamptz default now(),
  unique (curriculum_id, slug)                      -- scoped, so two curricula can both
);                                                  -- have 'jupiter'

create table artifacts (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references topics(id) on delete cascade,
  version    int  not null default 1,
  status     text not null default 'generating',    -- generating | ready | failed
  blueprint  jsonb,
  widgets    jsonb default '{}',                    -- { activityId: html }
  error      jsonb,                                 -- raw model output when a check fails
  created_at timestamptz default now(),
  unique (topic_id, version)
);

create table events (
  id              bigserial primary key,
  client_event_id text unique not null,             -- idempotency
  curriculum_id   uuid not null,                    -- denormalized for the dashboard query
  topic_id        uuid not null references topics(id) on delete cascade,
  artifact_id     uuid references artifacts(id),    -- which answer key graded this
  type            text not null,
  activity_kind   text,
  activity_id     text,
  objective_id    text,
  question_id     text,
  correct         boolean,                          -- server-graded; null = ungradeable
  attempt         int default 1,
  hint_used       boolean default false,
  payload         jsonb default '{}',
  created_at      timestamptz default now()
);

create index on events (topic_id);
create index on events (curriculum_id, created_at);
```

A global slug primary key would collide the moment the seed curriculum and a live
solar-system demo both produce `jupiter`. Scoping the unique constraint to the curriculum
is the fix, and it costs nothing.

`artifact_id` on events is what lets you tell, after a regeneration, which answer key graded
an old response.

No `responses`, `mastery`, `sessions`, `review_queue`, `generation_jobs`, or `daily_reports`
tables. Mastery is computed from `events` on read. `artifacts.status` replaces the job queue.

## Contracts — `lib/contracts.ts`, written first

```ts
Objective = { id, text }
Question  = { id, objectiveId, kind: 'mcq'|'truefalse'|'shortanswer',
              prompt, choices?, answer, feedbackCorrect, feedbackIncorrect }

// Exactly 4 activity kinds. Three map to renderer primitives, one to the widget.
Activity =
  | { id, kind: 'content',   title, body }
  | { id, kind: 'cards',     title, cards: { front, back }[] }
  | { id, kind: 'questions', title, questions: Question[] }
  | { id, kind: 'explore',   title, caption, widgetPrompt }   // widgetPrompt drives codegen

Blueprint = { title, objectives: Objective[], activities: Activity[], summary }

EventType = 'topic_opened' | 'activity_completed' | 'question_answered'
          | 'hint_requested' | 'topic_completed'

// Route response shapes live here too — these are what drift at integration:
CurriculumResponse, ArtifactResponse, ReportResponse, AskResponse, ApiError
```

Five event types, down from the spec's seventeen; they drive every mastery signal in section
22. Four activity kinds, because three renderer primitives plus a widget slot covers every
component in spec section 8 without four people building six bespoke components.

## LearnKit — 2 functions

Questions live in React, so the widget's entire job is "be interactive and say what
happened." The API is two calls because the model has to use it correctly having never seen
it.

```js
LearnKit.ready()                  // ping host; host falls back after 3s of silence
LearnKit.event(name, payload)     // e.g. ('orbit_completed', { planet: 'jupiter' })
```

No `answer()`. No answer keys in the frame. No IDs crossing the boundary.

## Widget smoke check — ~8 lines

```ts
const BANNED = /\b(fetch|XMLHttpRequest|eval|importScripts|sendBeacon|WebSocket|EventSource)\s*\(/i;

function smokeCheck(html: string): string | null {
  const s = html.replace(/^```[a-z]*\n?|```$/g, '').trim();   // strip markdown fences
  if (s.length < 200)                    return 'too-short';
  if (!/<\/(script|div|canvas|svg)>\s*$/i.test(s)) return 'truncated';
  if (BANNED.test(s))                    return 'egress';
  if (!s.includes('LearnKit.ready'))     return 'no-ready-ping';
  return null;
}
```

On failure, store the raw model output in `artifacts.error` and skip that widget — the
`WidgetSlot` falls back to the activity's static `caption`. At hour three you need to see
what the model actually said, and `/debug` is where you read it.

## Mastery

Pure function, no DB access, so the events route and the renderer share it:

```
per objective:  correct-on-first-attempt / attempted, hint-assisted answers excluded
mastered:       ratio >= 0.8  AND  >= 2 questions attempted
                AND evidence from >= 2 distinct activity_kinds
partial:        anything above 0 but below mastered  <-- the map shows a ring, not a binary
```

The map must show partial progress. A lesson with one `cards` round and one `questions`
round produces roughly eight interactions, which is what "mastered" actually requires.
Binary mastery after four answers is not reachable and the demo script depends on this.

## Timeline

```
  T+0:00 ---------------------------------------------- BLOCKING, everyone waits
    P1  create-next-app (TS, Tailwind, App Router) + install ai, @ai-sdk/anthropic,
        zod, @supabase/supabase-js, vitest. Push within 8 min. create-next-app
        gives you NONE of those.
    P4  lib/contracts.ts + supabase/schema.sql + Supabase project + .env.local
    P2/P3  clone, install, sketch against hardcoded mocks
  T+0:20 ---------------------------------------------- 4 lanes open
    P1  goal intake -> /api/curriculum -> curriculum map
    P2  curriculum gen, then blueprint gen
    P3  Renderer: Content, Cards, Questions, WidgetSlot placeholder
    P4  /api/events, grade(), mastery(), Vitest, /debug
  T+1:15 ---------------------------------------------- MANDATORY CHECKPOINT
    P3's Renderer draws P2's real generated blueprint, end to end, on screen.
    Contract drift found here costs 10 minutes. Found at T+3:00 it costs an hour.
  T+1:15 ----------------------------------------------
    P2  widget codegen + smokeCheck    P3  WidgetFrame + LearnKit + child theme
    P1  /api/report + /api/ask         P4  integration owner from here on
  T+2:00 ---------------------------------------------- SEED, as soon as gen works once
    P4  seed script: backup curriculum + a day of events
  T+2:30 ---------------------------------------------- polish only
    empty states, router.refresh() on mastery, generating copy
  T+3:00 ---------------------------------------------- integration on demo laptop
  T+3:15 ---------------------------------------------- HARD FEATURE FREEZE
    fresh git clone on the demo laptop, install, run the smoke checklist
  T+3:45 ---------------------------------------------- rehearse twice
```

**The seed script is insurance, not polish.** It is the only mitigation for an LLM rate
limit, an outage, or bad venue wifi, so it runs at T+2:00 the moment generation works once —
never at T+3:30, and never the thing you cut when behind.

## Kill switches — decide now, not at hour three

| Time | If this is true | Do this |
|---|---|---|
| T+2:00 | Widget codegen isn't producing anything usable | Ship renderer-only. Every `explore` activity shows its static caption. The lesson is still complete and the demo still works. |
| T+2:30 | Supabase is unreachable | **Not a clean swap** — separate route bundles and HMR make an in-memory `Map` unreliable. Real mitigation is creating the project at T+0:00 and verifying a write. If it dies anyway, demo the seeded read-only path. |
| T+3:00 | Q&A isn't working | Cut it. Keep the summary. |
| T+3:15 | Anything at all | Freeze. Fixes to the demo path only. |

## Demo script

1. Parent: "I want my 8-year-old to learn about the solar system. She loves dinosaurs."
2. Curriculum appears, ~15s, six topics with objectives.
3. Click **Jupiter**. The full lesson renders in about 15 seconds — intro, flashcards, quiz,
   review — with one placeholder where the interactive will go.
4. A few seconds later the placeholder becomes a live animated orbit the model wrote for
   this topic.
5. Work the flashcards, then the quiz. Get one wrong on purpose; show the corrective
   feedback. That is roughly eight interactions across two activity kinds.
6. Back to the map: Jupiter's ring shows 3 of 4 objectives mastered, one partial.
7. Parent tab: today's summary, then ask "how is she doing with the gas giants?"

There is no long silent wait in this script, which is the entire point of moving codegen
down to the widget.

## Smoke checklist — T+3:15, fresh clone, demo laptop

1. `git clone` into a new directory, install, `pnpm dev` starts clean
2. Goal intake accepts input, disables on submit, shows progress copy
3. Curriculum renders with 5-8 topics and objectives
4. Opening a topic renders a complete lesson within ~20s
5. The widget appears within ~20s more, or its caption shows and nothing looks broken
6. Answering a question shows feedback and writes a row to `events`
7. Going back to the map shows **updated** mastery — App Router caches, so this needs an
   explicit `router.refresh()`. It is the most likely stale-data bug in the demo.
8. The parent summary renders real numbers; Q&A returns a grounded answer
9. Empty states: a fresh curriculum and an untouched dashboard both read as intentional
10. `/debug` shows every artifact with status, widget count, and error

## NOT in scope — deliberate, with the reason

| Cut | Why | Cost to add later |
|---|---|---|
| pnpm monorepo, 9 workspaces | Setup tax with no payoff at 4 hours; ownership is by directory instead | Low |
| Full-page AI codegen | ~6x the latency and most of the failure surface, for chrome our own code draws correctly every time | Low |
| Second origin for artifacts | The `sandbox` attribute plus host-injected CSP is the real boundary | Low — contained in `WidgetFrame` |
| Auth, RLS, `children` table | No real user data. **The moment a real child's name goes in, this is a leak.** | Low — `parent_id` already exists |
| Job queue, worker route, cron | `artifacts.status` plus `INSERT ON CONFLICT` plus `after()` | Medium |
| Playwright + axe-core gate | Headless Chromium in the generation path is a latency and packaging problem | Medium |
| Second-model fact-check pass | **Leaves a real section 27 gap**: re-grading proves consistency, not correctness | Low |
| SM-2 spaced review | Unobservable in a 4-hour demo; nobody returns in six days | Medium |
| Daily report cron + timezones | Produces nothing visible on stage; summary is on demand | Low |
| Tool-calling Q&A agent | One child's data fits in a prompt; action tools are features in agent costume | Medium |
| 12 of 17 event types | Every type is a contract the model can get wrong; 5 cover all of section 22 | Low |
| Time-on-task tracking | Derived from `topic_opened` to `topic_completed` timestamps if the report needs it | Low |
| Sentry, `generation_traces` | `console.log` plus `artifacts.error` plus `/debug` | Low |
| Framer Motion, two design systems | CSS transitions; one theme with a child variable swap | Low |
| Test suite beyond one file | **Real debt.** One Vitest file on `grade()` and `mastery()`, plus a manual checklist | Medium |
| Vercel deploy | Localhost removes the 60s function cap, which is what lets `after()` run long | Medium |

## Known risks going in

- **Demo laptop is a single point of failure.** Designate it at T+0:00 and do the fresh-clone
  run on that machine, not on whoever finished first.
- **LLM provider outage or rate limit** empties every screen. The T+2:00 seed is the only
  mitigation.
- **Contract drift between P2's blueprint and P3's renderer** is the most likely integration
  failure. The T+1:15 checkpoint exists to catch it.
- **Stale mastery after navigating back** is the most likely visible bug. App Router caches;
  `router.refresh()` is the fix.
- **Test debt is near-total.** Accepted for a 4-hour clock, but this is not shippable to real
  users without it.
- **Answer keys are unverified.** No fact-check pass means the app can confidently teach a
  false fact, which spec section 27 explicitly forbids. Accepted, and it is the first thing
  to build after the hackathon.

## Build order

`lib/contracts.ts` lands before anyone writes a feature. Everything else depends on the
blueprint, event, and response shapes, and two people independently defining `Question` is
how this team loses an hour at T+3:00.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES_OPEN | mode: SCOPE_REDUCTION, 14 items cut, 1 critical gap accepted |
| Outside Voice | gpt-5.6-sol-high subagent | Independent 2nd opinion | 1 | ISSUES_FOUND | 25 findings, 6 were real bugs in the reviewed plan, 1 rejected as incorrect |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **CROSS-MODEL:** One substantive disagreement, on codegen scope. The review planned
  full-page artifact generation with a React fallback; the outside voice argued for
  generating only the interactive centerpiece. Resolved in favor of the outside voice —
  widget-scoped codegen cuts generation latency roughly sixfold and eliminates the
  question-id-drift bug class entirely, since no IDs cross the iframe boundary. One outside
  voice claim was rejected on evidence: `generateObject` is not deprecated in the current AI
  SDK, and it does carry retry plus a repair path.
- **CRITICAL GAP (1, accepted):** No fact-check pass on generated answer keys. Server
  re-grading proves consistency, not correctness, so the app can confidently teach a false
  fact — which spec section 27 explicitly forbids. Not rescued, not tested, and silent to
  the child. Accepted for a 4-hour clock; first thing to build afterward.
- **VERDICT:** CEO CLEARED for a 4-hour hackathon build — eng review required before any
  real-user deployment.

NO UNRESOLVED DECISIONS
