import Link from "next/link";
import type { ChildRow, CurriculumRow, TopicProgressRow } from "@eco/db";
import { createChild, enterChildMode } from "@/app/actions";
import { Book, ChevronRight, Play, Users } from "@/components/icons";
import { Avatar, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const AVATARS = ["🦊", "🐼", "🦉", "🐙", "🦖", "🐨", "🦄", "🐸"];

function readingLabel(level: string | null) {
  return level ? `${level.replace("_", " ")} reader` : null;
}

export default async function ParentHome() {
  await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: curricula }, { data: progress }] = await Promise.all([
    supabase.from("children").select("*").order("created_at"),
    supabase.from("curricula").select("id, child_id, status").order("created_at"),
    supabase.from("topic_progress").select("child_id, status"),
  ]);
  const children = (data ?? []) as ChildRow[];
  const curriculaByChild = new Map<string, number>();
  for (const c of (curricula ?? []) as Pick<CurriculumRow, "id" | "child_id" | "status">[]) curriculaByChild.set(c.child_id, (curriculaByChild.get(c.child_id) ?? 0) + 1);
  const completedByChild = new Map<string, number>();
  for (const p of (progress ?? []) as Pick<TopicProgressRow, "child_id" | "status">[]) if (p.status === "completed") completedByChild.set(p.child_id, (completedByChild.get(p.child_id) ?? 0) + 1);

  return (
    <>
      <PageHeader eyebrow="Your family" title="Children" description="Each child gets their own curricula, progress and daily summaries." />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionTitle hint={children.length ? `${children.length} ${children.length === 1 ? "learner" : "learners"}` : undefined}>Learners</SectionTitle>
          {children.length === 0 ? (
            <EmptyState icon={<Users size={22} />} title="Add your first child" body="Start with a name and age. You can add interests afterwards so lessons feel familiar to them." />
          ) : (
            <ul className="space-y-3">
              {children.map((c, i) => {
                const enter = enterChildMode.bind(null, c.id);
                const meta = [c.age ? `Age ${c.age}` : "Age not set", readingLabel(c.reading_level)].filter(Boolean).join(" · ");
                const n = curriculaByChild.get(c.id) ?? 0;
                const done = completedByChild.get(c.id) ?? 0;
                return (
                  <li key={c.id} className="card card-hover animate-rise flex flex-col gap-4" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <Avatar emoji={c.avatar} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-extrabold">{c.display_name}</h3>
                        <p className="text-sm text-ink-soft">{meta}</p>
                        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-ink-soft">
                          <span className="inline-flex items-center gap-1.5"><Book size={14} className="text-brand" />{n} {n === 1 ? "curriculum" : "curricula"}</span>
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" />{done} {done === 1 ? "topic" : "topics"} completed</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                      <Link href={`/parent/children/${c.id}`} className="btn-secondary">
                        Manage
                        <ChevronRight size={16} />
                      </Link>
                      <form action={enter}>
                        <button type="submit" className="btn-primary">
                          <Play size={14} />
                          Start learning
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="card h-fit lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold">Add a child</h2>
          <p className="mb-4 text-sm text-ink-soft">Takes ten seconds. You can refine everything later.</p>
          <form action={createChild} className="space-y-4">
            <div>
              <label htmlFor="display_name" className="label">First name or nickname</label>
              <input id="display_name" name="display_name" required maxLength={40} className="input" placeholder="Maya" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="age" className="label">Age</label>
                <input id="age" name="age" type="number" min={3} max={18} className="input" placeholder="7" />
              </div>
              <div>
                <label htmlFor="reading_level" className="label">Reading</label>
                <select id="reading_level" name="reading_level" className="input" defaultValue="">
                  <option value="">Not sure</option>
                  <option value="pre_reader">Pre-reader</option>
                  <option value="early">Early</option>
                  <option value="developing">Developing</option>
                  <option value="fluent">Fluent</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <fieldset>
              <legend className="label">Pick an avatar</legend>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((a, i) => (
                  <label key={a} className="cursor-pointer">
                    <input type="radio" name="avatar" value={a} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="grid h-12 w-full place-items-center rounded-xl border-2 border-line bg-card text-2xl transition peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 hover:border-line-strong">{a}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="btn-primary w-full">Add child</button>
            <p className="text-xs text-ink-faint">We only store what lessons need: a name, an age and a reading level.</p>
          </form>
        </aside>
      </div>
    </>
  );
}
