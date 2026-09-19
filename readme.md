# Sprout — AI learning app (MVP)

Parents describe a learning goal; the app turns it into a curriculum and generates a
self-contained interactive lesson for every topic, which children play in a sandboxed
iframe. Learning events flow back to compute per-objective mastery and daily parent
summaries. Full specification: [rules.md](rules.md). Architecture plan:
[ai_learning_app_architecture_929890fe.plan.md](ai_learning_app_architecture_929890fe.plan.md).

## Layout

```
apps/web                 Next.js 16 app: parent dashboard, child surface, API routes, job runner
apps/mobile              Capacitor iOS/Android shell that loads the hosted Next.js app
packages/contracts       Zod schemas: curriculum, ArtifactBlueprint, LearningEvent, postMessage envelope
packages/learnkit        In-artifact runtime (LearnKit), blueprint player/fallback renderer, HTML validator
packages/ai              Tier/task model routing (Gemini / Claude / mock), prompts, pipelines, mock seed content
packages/mastery         Pure grading + explainable mastery engine (tested)
packages/db              Supabase migration (schema + RLS) and row types
```

## How a lesson gets made

1. Parent submits a goal → `curricula` row + `curriculum` job.
2. Job calls `generateCurriculum` → `topics` + `learning_objectives`; pre-warms the first two lessons.
3. Opening a topic calls `ensureArtifact` → `artifact` job: `generateBlueprint` (schema + lint +
   cross-provider fact-check, repair loop) → `generateArtifactHtml` (codegen → normalise → static
   validation, up to 2 attempts) → published. If codegen is rejected, the deterministic blueprint
   player is published instead, so the child always gets a working lesson.
4. The player runs in `<iframe sandbox="allow-scripts">` with a strict CSP. It talks to the host only via
   `postMessage`; the host verifies the source window and a per-session nonce and batches events to
   `POST /api/events`.
5. Ingestion re-grades every answer against the blueprint (server is authoritative), writes
   `responses`, updates `objective_mastery` and `topic_progress`.

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in Supabase URL, anon key, service role key
```

Create a Supabase project and apply `packages/db/supabase/migrations/0001_core.sql`
(SQL editor, or `supabase db push` after `supabase link`). In Auth settings, disable
"Confirm email" for local development if you want password sign-up to log in immediately.

```bash
pnpm dev            # http://localhost:3000
pnpm test           # unit tests (mastery, learnkit, ai)
pnpm typecheck
pnpm build
```

### AI providers

Without keys everything runs on a deterministic **mock** provider: any goal mentioning the solar
system gets hand-checked seed content; other goals get a structurally complete demo lesson.
Set `GOOGLE_GENERATIVE_AI_API_KEY` and/or `ANTHROPIC_API_KEY` to generate real content. Model
choice per `(tier, task)` lives in `packages/ai/src/provider.ts` and can be overridden with env vars
such as `AI_MODEL_PAID_CODEGEN=anthropic:claude-opus-4-1`.

### Background jobs

Jobs are kicked immediately with `after()` and swept by `GET /api/jobs/run` (protected by
`CRON_SECRET`). `apps/web/vercel.json` schedules the sweep every minute on Vercel. Locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/run
```

## Mobile (Capacitor)

The native apps are a WebView around the **hosted** Next.js site. They do not statically export the web app, so cookies, server actions, jobs, and `/api/*` keep working.

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
# iOS Simulator:     CAPACITOR_SERVER_URL=http://localhost:3000
# Android emulator:  CAPACITOR_SERVER_URL=http://10.0.2.2:3000
# Physical device:   CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:3000
# Production:        CAPACITOR_SERVER_URL=https://your-app.vercel.app

pnpm mobile:sync          # bake the URL + plugins into ios/ and android/
pnpm mobile:apk           # debug APK, no Android Studio required
pnpm mobile:ios           # open Xcode (full Xcode app required to build)
pnpm mobile:android       # open Android Studio
```

The debug APK is written to:

`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Install it with `adb install -r` or by copying it onto a phone. `pnpm mobile:android` only opens Android Studio at `/Applications/Android Studio.app`; if Studio lives somewhere else, set `CAPACITOR_ANDROID_STUDIO_PATH`.

Keep `pnpm dev` running when the URL is localhost, `10.0.2.2`, or a LAN IP. Changing `CAPACITOR_SERVER_URL` requires `pnpm mobile:sync` and a new native build. For a physical phone, bind Next to all interfaces (`pnpm --filter web dev -- --hostname 0.0.0.0`) and use the Mac’s LAN IP.

iOS uses Swift Package Manager (no CocoaPods). Building the iOS app needs the Xcode **app**, not only Command Line Tools.

## Not in this MVP

- Billing (Stripe, credit ledger, entitlements) — model routing already keys off `parents.tier`.
- Separate sandbox origin — the iframe uses `srcdoc` + `sandbox` + CSP, which gives an opaque
  origin today; a dedicated domain is a deployment step, not a code change.
- Parent Q&A agent, spaced-review queue, headless smoke test of generated code, PIN gate on
  "For grown-ups".
