import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChildRow, CurriculumRow, PersonalizationRow, TopicProgressRow, TopicRow } from "@eco/db";
import { addContext, createCurriculum, enterChildMode, removeContext } from "@/app/actions";
import { Book, Chart, ChevronRight, Heart, Play, Sparkles, X } from "@/components/icons";
import { Avatar, EmptyState, PageHeader, ProgressRing, SectionTitle, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ChildPage(props: PageProps<"/parent/children/[childId]">) {
  await requireUser();
  const { childId } = await props.params;
  const supabase = await createClient();

  const [{ data: child }, { data: ctx }, { data: curricula }, { data: progress }] = await Promise.all([
    supabase.from("children").select("*").eq("id", childId).maybeSingle(),
    supabase.from("personalization_context").select("*").eq("child_id", childId).eq("active", true).order("created_at"),
    supabase.from("curricula").select("*").eq("child_id", childId).order("created_at", { ascending: false }),
    supabase.from("topic_progress").select("*").eq("child_id", childId),
  ]);
  if (!child) notFound();
  const c = child as ChildRow;
  const context = (ctx ?? []) as PersonalizationRow[];
  const curriculumRows = (curricula ?? []) as CurriculumRow[];
  const progressRows = (progress ?? []) as TopicProgressRow[];

  const { data: topics } = curriculumRows.length
    ? await supabase.from("topics").select("id, curriculum_id").in("curriculum_id", curriculumRows.map((cur) => cur.id))
    : { data: [] };
  const topicsByCurriculum = new Map<string, string[]>();
  for (const t of (topics ?? []) as Pick<TopicRow, "id" | "curriculum_id">[]) topicsByCurriculum.set(t.curriculum_id, [...(topicsByCurriculum.get(t.curriculum_id) ?? []), t.id]);
  const progressByTopic = new Map(progressRows.map((p) => [p.topic_id, p]));

  const completed = progressRows.filter((p) => p.status === "completed").length;
  const needsReview = progressRows.filter((p) => p.status === "needs_review").length;
  const meta = [c.age ? `Age ${c.age}` : "Age not set", c.reading_level ? `${c.reading_level.replace("_", " ")} reader` : null].filter(Boolean).join(" · ");

  const enter = enterChildMode.bind(null, c.id);
  const addCtx = addContext.bind(null, c.id);
  const newCurriculum = createCurriculum.bind(null, c.id);

  return (
    <>
      <PageHeader
        eyebrow="Child"
        leading={<Avatar emoji={c.avatar} size="lg" className="mt-1" />}
        title={c.display_name}
        description={`${meta} · ${completed} topic${completed === 1 ? "" : "s"} completed${needsReview ? ` · ${needsReview} to review` : ""}`}
        actions={
          <>
            <Link href={`/parent/children/${c.id}/report`} className="btn-secondary">
              <Chart size={16} />
              Daily summary
            </Link>
            <form action={enter}>
              <button type="submit" className="btn-primary">
                <Play size={14} />
                Open kid mode
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <section>
            <SectionTitle hint="Every goal becomes an ordered set of lessons.">Curricula</SectionTitle>
            {curriculumRows.length === 0 ? (
              <EmptyState icon={<Book size={22} />} title="No curriculum yet" body="Describe what you'd like them to learn and we'll turn it into an ordered set of lessons." />
            ) : (
              <ul className="space-y-3">
                {curriculumRows.map((cur) => {
                  const ids = topicsByCurriculum.get(cur.id) ?? [];
                  const done = ids.filter((id) => progressByTopic.get(id)?.status === "completed").length;
                  const pct = ids.length ? done / ids.length : 0;
                  return (
                    <li key={cur.id}>
                      <Link href={`/parent/curricula/${cur.id}`} className="card card-hover flex items-center gap-4">
                        <ProgressRing value={pct} size={52} stroke={5}>
                          <span className="text-xs font-black tabular-nums text-brand-deep">{ids.length ? `${done}/${ids.length}` : "…"}</span>
                        </ProgressRing>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold">{cur.title || "Preparing…"}</h3>
                            <StatusBadge status={cur.status} />
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{cur.description || cur.goal_text}</p>
                        </div>
                        <ChevronRight size={18} className="text-ink-faint" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card relative overflow-hidden">
            <span className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-sun-soft/70" aria-hidden />
            <div className="relative">
              <div className="mb-3 flex items-center gap-3">
                <span className="tile h-10 w-10 bg-sun-soft text-sun-deep"><Sparkles size={18} /></span>
                <div>
                  <h2 className="text-lg font-extrabold">New learning goal</h2>
                  <p className="text-sm text-ink-soft">Write it the way you would say it. No prompting skills needed.</p>
                </div>
              </div>
              <form action={newCurriculum} className="space-y-3">
                <textarea name="goal" required minLength={5} maxLength={600} rows={3} className="input" placeholder="I want my child to learn about the solar system and all the planets." />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-ink-faint">5 to 14 lessons, from familiar to new.</p>
                  <button type="submit" className="btn-primary">Create curriculum</button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card">
            <div className="mb-1 flex items-center gap-2">
              <Heart size={16} className="text-berry" />
              <h2 className="font-extrabold">Interests and notes</h2>
            </div>
            <p className="mb-4 text-sm text-ink-soft">Used as teaching bridges: analogies, scenarios and themes. The learning goal never changes.</p>
            <ul className="mb-4 flex flex-wrap gap-2">
              {context.length === 0 ? <li className="text-sm text-ink-faint">Nothing yet. Try &ldquo;dinosaurs&rdquo; or &ldquo;loves drawing&rdquo;.</li> : null}
              {context.map((item) => {
                const remove = removeContext.bind(null, c.id, item.id);
                return (
                  <li key={item.id} className={`badge py-1 pr-1 pl-3 ${item.kind === "interest" ? "bg-sun-soft text-sun-deep" : "bg-paper-deep text-ink-soft"}`}>
                    {item.value}
                    <form action={remove}>
                      <button type="submit" aria-label={`Remove ${item.value}`} className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-black/10">
                        <X size={12} />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <form action={addCtx} className="flex flex-wrap gap-2">
              <select name="kind" className="input w-24 shrink-0" defaultValue="interest" aria-label="Type">
                <option value="interest">Likes</option>
                <option value="note">Note</option>
              </select>
              <input name="value" required maxLength={200} className="input min-w-0 flex-1" placeholder="dinosaurs, drawing…" aria-label="Value" />
              <button type="submit" className="btn-secondary shrink-0">Add</button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
