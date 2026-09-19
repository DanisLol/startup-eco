import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChildRow, CurriculumRow, TopicProgressRow, TopicRow } from "@eco/db";
import { AutoRefresh } from "@/components/auto-refresh";
import { ArrowRight, Check, Play, Refresh, Sparkles } from "@/components/icons";
import { Avatar, ProgressRing } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

type Status = TopicProgressRow["status"];

const STATUS_STYLE: Record<Status, { card: string; tile: string; label: string }> = {
  not_started: { card: "border-line", tile: "bg-paper-deep text-ink-soft", label: "New" },
  in_progress: { card: "border-sky/40", tile: "bg-sky-soft text-sky", label: "Keep going" },
  needs_review: { card: "border-sun/60", tile: "bg-sun-soft text-sun-deep", label: "Practise again" },
  completed: { card: "border-brand/40", tile: "bg-brand text-white", label: "Done" },
};

export default async function ChildMap(props: PageProps<"/learn/[childId]">) {
  const { childId } = await props.params;
  const supabase = await createClient();
  const [{ data: child }, { data: curricula }, { data: progress }] = await Promise.all([
    supabase.from("children").select("*").eq("id", childId).maybeSingle(),
    supabase.from("curricula").select("*").eq("child_id", childId).order("created_at"),
    supabase.from("topic_progress").select("*").eq("child_id", childId),
  ]);
  if (!child) notFound();
  const c = child as ChildRow;
  const curriculumRows = (curricula ?? []) as CurriculumRow[];
  const progressByTopic = new Map(((progress ?? []) as TopicProgressRow[]).map((p) => [p.topic_id, p]));

  const { data: topics } = curriculumRows.length
    ? await supabase.from("topics").select("*").in("curriculum_id", curriculumRows.map((cur) => cur.id)).order("position")
    : { data: [] };
  const topicsByCurriculum = new Map<string, TopicRow[]>();
  for (const t of (topics ?? []) as TopicRow[]) topicsByCurriculum.set(t.curriculum_id, [...(topicsByCurriculum.get(t.curriculum_id) ?? []), t]);

  const anyGenerating = curriculumRows.some((cur) => cur.status === "generating");
  const statusOf = (t: TopicRow): Status => progressByTopic.get(t.id)?.status ?? "not_started";

  return (
    <div className="py-2">
      {anyGenerating ? <AutoRefresh intervalMs={5000} /> : null}
      <div className="mb-10 flex items-center gap-4">
        <Avatar emoji={c.avatar} size="lg" className="animate-float" />
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Hi {c.display_name}!</h1>
          <p className="text-ink-soft">Pick something to explore.</p>
        </div>
      </div>

      {curriculumRows.length === 0 ? (
        <div className="card dotted-bg py-12 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-sun-soft text-3xl" aria-hidden>🌱</div>
          <p className="text-lg font-extrabold">Nothing here yet</p>
          <p className="text-ink-soft">Ask a grown-up to add a learning goal.</p>
        </div>
      ) : null}

      <div className="space-y-12">
        {curriculumRows.map((cur) => {
          const list = topicsByCurriculum.get(cur.id) ?? [];
          const done = list.filter((t) => statusOf(t) === "completed").length;
          const nextTopic =
            list.find((t) => {
              const s = statusOf(t);
              return s === "in_progress" || s === "needs_review";
            }) ?? list.find((t) => statusOf(t) === "not_started");
          const nextStatus = nextTopic ? statusOf(nextTopic) : null;
          return (
            <section key={cur.id}>
              <div className="mb-4 flex items-center gap-4">
                {list.length ? (
                  <ProgressRing value={done / list.length} size={56} stroke={6}>
                    <span className="text-xs font-black tabular-nums text-brand-deep">{done}/{list.length}</span>
                  </ProgressRing>
                ) : null}
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-tight">{cur.title || "Getting ready…"}</h2>
                  <p className="text-ink-soft">{cur.description}</p>
                </div>
              </div>

              {cur.status === "generating" ? (
                <div className="card mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-soft text-violet"><Sparkles size={18} className="animate-pulse" /></span>
                  <p>Your topics are being prepared. They will appear here in a moment.</p>
                </div>
              ) : null}

              {nextTopic ? (
                <Link
                  href={`/learn/${c.id}/topics/${nextTopic.id}`}
                  className="group relative mb-4 flex items-center gap-4 overflow-hidden rounded-3xl bg-brand p-5 text-white shadow-lift transition hover:-translate-y-0.5 sm:gap-6 sm:p-6"
                >
                  <span className="pointer-events-none absolute -top-20 -right-12 h-48 w-48 rounded-full bg-white/10" aria-hidden />
                  <span className="pointer-events-none absolute -bottom-28 right-36 h-40 w-40 rounded-full bg-sun/15" aria-hidden />
                  <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl font-black sm:h-16 sm:w-16" aria-hidden>
                    {nextStatus === "needs_review" ? <Refresh size={26} /> : nextTopic.position}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="mb-0.5 block text-xs font-black tracking-widest text-white/75 uppercase">
                      {nextStatus === "needs_review" ? "Practise again" : nextStatus === "in_progress" ? "Keep going" : "Up next"}
                    </span>
                    <span className="block text-xl leading-tight font-black sm:text-2xl">{nextTopic.title}</span>
                    <span className="mt-1 line-clamp-1 block text-sm text-white/80">{nextTopic.description}</span>
                  </span>
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-brand-deep shadow-soft transition group-hover:scale-105" aria-hidden>
                    <Play size={20} />
                  </span>
                </Link>
              ) : null}

              <ol className="grid gap-3 sm:grid-cols-2">
                {list.map((t, i) => {
                  const status = statusOf(t);
                  const style = STATUS_STYLE[status];
                  const isNext = nextTopic?.id === t.id;
                  return (
                    <li key={t.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <Link href={`/learn/${c.id}/topics/${t.id}`} className={`card card-hover flex h-full items-center gap-4 border-2 ${style.card} ${isNext ? "ring-4 ring-brand/15" : ""}`}>
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-black ${style.tile}`} aria-hidden>
                          {status === "completed" ? <Check size={22} /> : t.position}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg leading-tight font-extrabold">{t.title}</span>
                          <span className="mt-0.5 block text-sm text-ink-soft">{isNext ? "Start here" : style.label}</span>
                        </span>
                        <ArrowRight size={18} className="text-ink-faint" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
