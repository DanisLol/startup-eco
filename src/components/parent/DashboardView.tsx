import Link from "next/link";
import type { DashboardData, Lesson, ParentUpdate } from "@/lib/types";
import { SignOutButton } from "./SignOutButton";
import { LinkFamilyForm } from "./LinkFamilyForm";
import { AddChildForm } from "./AddChildForm";

function progressPercent(lesson: Lesson | null, latest: DashboardData["sessions"][number] | undefined) {
  if (!lesson?.artifact || !latest) return 0;
  return Math.round((latest.stats.stepsCompleted / latest.stats.stepsTotal) * 100);
}

function statusLabel(update: ParentUpdate) {
  if (update.sms_status === "sent") return "Sent by text";
  if (update.sms_status === "failed") return "Text failed · available here";
  if (update.sms_status === "pending") return "Text pending";
  return "Dashboard update";
}

export function DashboardView({ data, email, demoMode = false }: { data: DashboardData | null; email: string; demoMode?: boolean }) {
  if (!data) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
        <header className="flex items-center justify-between"><p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">Pebble parent</p><SignOutButton /></header>
        <section className="mt-16"><p className="text-sm font-semibold text-stone">Signed in as {email}</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">Your dashboard is ready.</h1><LinkFamilyForm /></section>
      </main>
    );
  }

  const latest = data.sessions[0];
  const percent = progressPercent(data.lesson, latest);
  const completedTopics = data.sessions.filter((item) => !item.stats.stoppedEarly).length;
  const needsReview = data.sessions.filter((item) => item.stats.stoppedEarly || (item.stats.quizzesAttempted > 0 && item.stats.quizzesCorrect < item.stats.quizzesAttempted / 2));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-5 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><Link href="/parent" className="text-sm font-semibold text-creek hover:underline">← All children</Link><div><p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">Pebble parent</p><p className="mt-1 text-sm text-stone">{email}</p></div></div><div className="flex items-center gap-3">{!demoMode ? <AddChildForm /> : null}{demoMode ? <Link href="/parent/login" className="rounded-full border-2 border-deep/15 px-4 py-2 text-sm font-semibold text-deep">Back to login</Link> : <SignOutButton />}</div></header>
      {demoMode ? <div className="mt-6 rounded-2xl border-2 border-apricot bg-apricot/20 px-4 py-3 text-sm font-semibold text-deep">Demo mode — this dashboard uses sample volcano data. Nothing is saved.</div> : null}
      <section className="mt-10"><p className="text-sm font-semibold uppercase tracking-[0.15em] text-creek">{data.child.name}’s learning journey</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight text-deep md:text-5xl">Small hops. Real progress.</h1><p className="mt-3 max-w-2xl text-lg text-stone">Here is what your child has explored, what is next, and the same update sent to your phone.</p></section>

      <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Progress summary">
        <article className="rounded-[28px] bg-deep p-6 text-foam"><p className="text-sm text-foam/70">Current topic</p><h2 className="mt-2 text-2xl font-bold">{data.lesson?.topic ?? "No topic yet"}</h2><p className="mt-4 text-sm text-foam/75">{latest ? `${latest.stats.stepsCompleted} of ${latest.stats.stepsTotal} steps complete` : "Waiting for the first learning session"}</p></article>
        <article className="rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]"><p className="text-sm text-stone">Journey progress</p><p className="mt-2 text-4xl font-extrabold text-deep">{percent}%</p><div className="mt-4 h-3 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-creek" style={{ width: `${percent}%` }} /></div></article>
        <article className="rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]"><p className="text-sm text-stone">Completed sessions</p><p className="mt-2 text-4xl font-extrabold text-deep">{completedTopics}</p><p className="mt-2 text-sm text-stone">{data.sessions.length ? "Learning activity recorded" : "No finished sessions yet"}</p></article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]"><div className="flex items-center justify-between gap-4"><h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">Recent activity</h2><span className="text-sm text-stone">{data.sessions.length} session{data.sessions.length === 1 ? "" : "s"}</span></div>{data.sessions.length === 0 ? <p className="mt-6 rounded-2xl bg-sand/60 p-4 text-stone">When your child finishes a lesson, the activity will appear here.</p> : <ul className="mt-5 grid gap-3">{data.sessions.slice(0, 6).map(({ session, lesson, stats, activity }) => <li key={session.id} className="rounded-2xl border-2 border-deep/10 p-4" title={activity.description}><div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-deep">{lesson.topic}</strong><time className="text-sm text-stone">{new Date(session.ended_at ?? session.started_at).toLocaleDateString()}</time></div><p className="mt-1 text-sm text-stone">{stats.stepsCompleted} of {stats.stepsTotal} steps · {stats.quizzesAttempted ? `${stats.quizzesCorrect}/${stats.quizzesAttempted} quiz answers right` : "No quiz attempted"}</p><details className="mt-3 rounded-xl bg-foam px-3 py-2 text-sm"><summary className="cursor-pointer font-semibold text-creek">What was this about?</summary><p className="mt-2 text-stone">{activity.description}</p>{activity.learned.length ? <><p className="mt-3 font-semibold text-deep">What they learned</p><ul className="mt-1 list-disc space-y-1 pl-5 text-stone">{activity.learned.map((item) => <li key={item}>{item}</li>)}</ul></> : null}</details></li>)}</ul>}</article>
        <div className="grid gap-6"><article className="rounded-[28px] bg-sand/80 p-6"><h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">Needs a revisit</h2>{needsReview.length === 0 ? <p className="mt-3 text-stone">Nothing is flagged for review right now.</p> : <ul className="mt-3 grid gap-2 text-sm text-deep">{needsReview.slice(0, 3).map(({ session, lesson }) => <li key={session.id}>↗ {lesson.topic} — a short review could help.</li>)}</ul>}</article><article className="rounded-[28px] bg-foam p-6"><h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">How to read this</h2><p className="mt-3 text-sm text-stone">These are learning observations, not judgments. Time is shown as context; answers and completed activities are the evidence.</p></article></div>
      </section>

      <section className="mt-6 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">Updates sent to you</h2><span className="text-sm text-stone">SMS + dashboard</span></div>{data.updates.length === 0 ? <p className="mt-4 text-stone">Your first learning update will appear here after a lesson ends.</p> : <ul className="mt-5 grid gap-4">{data.updates.map((update) => <li key={update.id} className="rounded-2xl border-2 border-deep/10 p-4"><div className="flex flex-wrap justify-between gap-2 text-sm text-stone"><time>{new Date(update.created_at).toLocaleString()}</time><span>{statusLabel(update)}</span></div><p className="mt-3 text-deep">{update.message_body}</p></li>)}</ul>}</section>
    </main>
  );
}
