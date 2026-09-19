import "server-only";
import { after } from "next/server";
import { ArtifactBlueprint, type GeneratedCurriculum } from "@eco/contracts";
import { blockingIssues, generateArtifactHtml, generateBlueprint, generateCurriculum, type PipelineMeta, type Tier } from "@eco/ai";
import type { ArtifactRow, ChildRow, CurriculumRow, GenerationJobRow, JobKind, ObjectiveRow, PersonalizationRow, TopicRow } from "@eco/db";
import { learnerContextFrom } from "@/lib/learner";
import { buildDailyReport } from "@/lib/report";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Minimal Postgres-backed job queue.
 *
 * Jobs are enqueued by server actions, kicked immediately with `after()` by
 * the caller, and swept by /api/jobs/run for anything that was missed.
 * Every handler is idempotent enough to be retried.
 */

export type JobPayload =
  | { kind: "curriculum"; curriculumId: string }
  | { kind: "artifact"; topicId: string; reason?: "initial" | "prewarm" | "regenerate" }
  | { kind: "daily_report"; childId: string; date: string };

export async function enqueueJob(payload: JobPayload): Promise<string> {
  const db = createServiceClient();
  const { kind, ...rest } = payload;
  const { data, error } = await db
    .from("generation_jobs")
    .insert({ kind: kind satisfies JobKind, payload: rest })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Start a job without blocking the current response. `after()` keeps the
 * serverless function alive until the job finishes; outside a request scope
 * (tests, scripts) it falls back to a plain detached promise.
 */
export function kickJob(jobId: string): void {
  try {
    after(() => runJob(jobId));
  } catch {
    void runJob(jobId);
  }
}

/** Claim and run one job. Safe to call concurrently; the claim is atomic. */
export async function runJob(jobId: string): Promise<void> {
  const db = createServiceClient();
  const { data: claimed } = await db
    .from("generation_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (!claimed) return; // someone else has it, or it is done
  const job = claimed as GenerationJobRow;

  try {
    const usage = await dispatch(job);
    await db
      .from("generation_jobs")
      .update({ status: "done", finished_at: new Date().toISOString(), usage: usage ?? null, attempts: job.attempts + 1 })
      .eq("id", job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = job.attempts + 1;
    const retry = attempts < job.max_attempts;
    await db
      .from("generation_jobs")
      .update({
        status: retry ? "queued" : "failed",
        attempts,
        error: message.slice(0, 2000),
        finished_at: retry ? null : new Date().toISOString(),
        run_after: new Date(Date.now() + attempts * 30_000).toISOString(),
      })
      .eq("id", job.id);
    console.error(`[jobs] ${job.kind} ${job.id} failed (attempt ${attempts}):`, message);
  }
}

export async function runQueuedJobs(limit = 5): Promise<number> {
  const db = createServiceClient();
  // Reclaim jobs stuck in "running" for over 10 minutes (crashed worker).
  await db
    .from("generation_jobs")
    .update({ status: "queued" })
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - 10 * 60_000).toISOString());

  const { data } = await db
    .from("generation_jobs")
    .select("id")
    .eq("status", "queued")
    .lte("run_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  const ids = (data ?? []).map((r) => r.id as string);
  await Promise.all(ids.map((id) => runJob(id)));
  return ids.length;
}

async function dispatch(job: GenerationJobRow): Promise<unknown> {
  switch (job.kind) {
    case "curriculum":
      return runCurriculumJob(job.payload.curriculumId as string);
    case "artifact":
      return runArtifactJob(job.payload.topicId as string);
    case "daily_report":
      return runDailyReportJob(job.payload.childId as string, job.payload.date as string);
  }
}

/* ------------------------------------------------------------------ */

async function loadChildContext(childId: string) {
  const db = createServiceClient();
  const [{ data: child }, { data: ctx }, { data: parent }] = await Promise.all([
    db.from("children").select("*").eq("id", childId).single(),
    db.from("personalization_context").select("*").eq("child_id", childId).eq("active", true),
    db.from("children").select("parent_id, parents!inner(tier)").eq("id", childId).single(),
  ]);
  if (!child) throw new Error(`child ${childId} not found`);
  const tier = ((parent as { parents?: { tier?: Tier } } | null)?.parents?.tier ?? "free") as Tier;
  return { child: child as ChildRow, learner: learnerContextFrom(child as ChildRow, (ctx ?? []) as PersonalizationRow[]), tier };
}

async function runCurriculumJob(curriculumId: string): Promise<PipelineMeta> {
  const db = createServiceClient();
  const { data: cur } = await db.from("curricula").select("*").eq("id", curriculumId).single();
  if (!cur) throw new Error(`curriculum ${curriculumId} not found`);
  const curriculum = cur as CurriculumRow;
  const { learner, tier } = await loadChildContext(curriculum.child_id);

  let generated: GeneratedCurriculum;
  let meta: PipelineMeta;
  try {
    ({ curriculum: generated, meta } = await generateCurriculum({ goal: curriculum.goal_text, learner, tier }));
  } catch (err) {
    await db.from("curricula").update({ status: "failed", error: (err as Error).message.slice(0, 1000) }).eq("id", curriculumId);
    throw err;
  }

  // Idempotency: if topics already exist for this curriculum, do not duplicate.
  const { count } = await db.from("topics").select("id", { count: "exact", head: true }).eq("curriculum_id", curriculumId);
  if (!count) {
    const { data: topics, error } = await db
      .from("topics")
      .insert(
        generated.topics.map((t, i) => ({
          curriculum_id: curriculumId,
          slug: t.slug,
          title: t.title,
          description: t.description,
          position: i + 1,
          difficulty: t.difficulty,
          prerequisites: t.prerequisites,
        })),
      )
      .select("id, slug");
    if (error) throw error;
    const idBySlug = new Map((topics ?? []).map((t) => [t.slug as string, t.id as string]));
    const objectives = generated.topics.flatMap((t) =>
      t.learningObjectives.map((text, i) => ({ topic_id: idBySlug.get(t.slug)!, code: `lo${i + 1}`, text, position: i + 1 })),
    );
    const { error: objErr } = await db.from("learning_objectives").insert(objectives);
    if (objErr) throw objErr;
  }

  await db
    .from("curricula")
    .update({ title: generated.title, description: generated.description, status: "ready", error: null })
    .eq("id", curriculumId);

  // Pre-warm the first two lessons so the child never waits on the first open.
  const { data: firstTopics } = await db
    .from("topics")
    .select("id")
    .eq("curriculum_id", curriculumId)
    .order("position", { ascending: true })
    .limit(2);
  for (const t of firstTopics ?? []) {
    const id = await enqueueJob({ kind: "artifact", topicId: t.id as string, reason: "prewarm" });
    kickJob(id);
  }
  return meta;
}

async function runArtifactJob(topicId: string): Promise<unknown> {
  const db = createServiceClient();
  const { data: topicRow } = await db.from("topics").select("*").eq("id", topicId).single();
  if (!topicRow) throw new Error(`topic ${topicId} not found`);
  const topic = topicRow as TopicRow;

  // Skip if a published artifact already exists and nobody asked for a regenerate
  // (regenerate requests create a "generating" placeholder first, see ensureArtifact).
  const { data: existing } = await db
    .from("artifacts")
    .select("*")
    .eq("topic_id", topicId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latest = existing as ArtifactRow | null;
  let target: ArtifactRow;
  if (latest && latest.status === "generating") {
    target = latest;
  } else if (latest && latest.status === "published") {
    return { skipped: true, artifactId: latest.id };
  } else {
    const version = (latest?.version ?? 0) + 1;
    const { data, error } = await db.from("artifacts").insert({ topic_id: topicId, version, status: "generating" }).select("*").single();
    if (error) throw error;
    target = data as ArtifactRow;
  }

  try {
    const [{ data: cur }, { data: siblings }, { data: objectiveRows }] = await Promise.all([
      db.from("curricula").select("*").eq("id", topic.curriculum_id).single(),
      db.from("topics").select("title, position").eq("curriculum_id", topic.curriculum_id).order("position"),
      db.from("learning_objectives").select("*").eq("topic_id", topicId).order("position"),
    ]);
    const curriculum = cur as CurriculumRow;
    const objectives = (objectiveRows ?? []) as ObjectiveRow[];
    const { learner, tier } = await loadChildContext(curriculum.child_id);
    const priorPerformance = await describePriorPerformance(curriculum.child_id, topic.curriculum_id);

    const bpResult = await generateBlueprint({
      topic: { slug: topic.slug, title: topic.title, description: topic.description, objectives: objectives.map((o) => o.text), difficulty: topic.difficulty },
      curriculum: { title: curriculum.title, description: curriculum.description, topicTitles: (siblings ?? []).map((s) => s.title as string) },
      learner,
      priorPerformance,
      tier,
    });
    const blueprint = ArtifactBlueprint.parse(bpResult.blueprint);

    // Keep objective rows in sync with the blueprint (models occasionally add one).
    const known = new Set(objectives.map((o) => o.code));
    const missing = blueprint.learningObjectives.filter((o) => !known.has(o.code));
    if (missing.length) {
      await db.from("learning_objectives").insert(missing.map((o, i) => ({ topic_id: topicId, code: o.code, text: o.text, position: objectives.length + i + 1 })));
    }

    // Only safety issues block publishing. Critical factual issues went through
    // one automatic repair pass and any remaining ones are recorded on the
    // artifact's validation report so the parent (and dev) can see them.
    const blocked = blockingIssues(bpResult.factcheck);
    if (blocked.length > 0) {
      throw new Error(`fact-check blocked publishing (safety): ${blocked.map((c) => `${c.where}: ${c.problem}`).join("; ")}`);
    }

    const code = await generateArtifactHtml({ blueprint, tier });

    await db
      .from("artifacts")
      .update({
        status: "published",
        blueprint,
        html: code.html,
        used_fallback: code.usedFallback,
        provider: code.meta.provider,
        model: code.meta.modelId,
        prompt_version: code.meta.promptVersion,
        validation_report: {
          html: code.validation,
          lint: bpResult.lintProblems,
          factcheck: bpResult.factcheck,
          codegenAttempts: code.attempts,
          blueprintModel: `${bpResult.meta.provider}:${bpResult.meta.modelId}`,
        },
        error: null,
        published_at: new Date().toISOString(),
      })
      .eq("id", target.id);

    return { artifactId: target.id, usage: [...bpResult.meta.usage, ...code.meta.usage] };
  } catch (err) {
    await db
      .from("artifacts")
      .update({ status: "failed", error: (err as Error).message.slice(0, 2000) })
      .eq("id", target.id);
    throw err;
  }
}

/** Short natural-language summary of how the child has done so far in this curriculum. */
async function describePriorPerformance(childId: string, curriculumId: string): Promise<string | undefined> {
  const db = createServiceClient();
  const { data } = await db
    .from("topic_progress")
    .select("status, mastery, weak_objective_codes, topics!inner(title, curriculum_id)")
    .eq("child_id", childId)
    .eq("topics.curriculum_id", curriculumId);
  const rows = (data ?? []) as unknown as Array<{ status: string; mastery: number; weak_objective_codes: string[]; topics: { title: string } }>;
  if (rows.length === 0) return undefined;
  return rows
    .map((r) => `${r.topics.title}: ${r.status.replace("_", " ")}, mastery ${(Number(r.mastery) * 100).toFixed(0)}%${r.weak_objective_codes.length ? ` (weak: ${r.weak_objective_codes.join(", ")})` : ""}`)
    .join("\n");
}

async function runDailyReportJob(childId: string, date: string) {
  const report = await buildDailyReport(childId, date);
  return { summaryLength: report.summary.length };
}

/* ------------------------------------------------------------------ */

/**
 * Called when a child opens a topic. Returns the latest artifact, enqueueing
 * generation if none exists or the latest one failed.
 */
export async function ensureArtifact(topicId: string, opts: { regenerate?: boolean } = {}): Promise<ArtifactRow | null> {
  const db = createServiceClient();
  const { data } = await db.from("artifacts").select("*").eq("topic_id", topicId).order("version", { ascending: false }).limit(1).maybeSingle();
  const latest = (data as ArtifactRow | null) ?? null;

  if (opts.regenerate && latest?.status !== "generating") {
    const { data: created, error } = await db
      .from("artifacts")
      .insert({ topic_id: topicId, version: (latest?.version ?? 0) + 1, status: "generating" })
      .select("*")
      .single();
    if (error) throw error;
    const id = await enqueueJob({ kind: "artifact", topicId, reason: "regenerate" });
    kickJob(id);
    return created as ArtifactRow;
  }

  if (latest && latest.status !== "failed") return latest;

  const { data: created, error } = await db
    .from("artifacts")
    .insert({ topic_id: topicId, version: (latest?.version ?? 0) + 1, status: "generating" })
    .select("*")
    .single();
  if (error) throw error;
  const id = await enqueueJob({ kind: "artifact", topicId, reason: "initial" });
  kickJob(id);
  return created as ArtifactRow;
}

/** Fire-and-forget pre-warm of the topic after the given one. */
export async function prewarmNextTopic(topicId: string): Promise<void> {
  const db = createServiceClient();
  const { data: t } = await db.from("topics").select("curriculum_id, position").eq("id", topicId).single();
  if (!t) return;
  const { data: next } = await db
    .from("topics")
    .select("id")
    .eq("curriculum_id", t.curriculum_id)
    .gt("position", t.position)
    .order("position")
    .limit(1)
    .maybeSingle();
  if (!next) return;
  const { data: existing } = await db.from("artifacts").select("id").eq("topic_id", next.id).limit(1).maybeSingle();
  if (existing) return;
  await ensureArtifact(next.id as string);
}
