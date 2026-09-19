import Link from "next/link";
import type { ParentHomeData } from "@/lib/types";
import { AddChildForm } from "./AddChildForm";
import { ChildCard } from "./ChildCard";
import { SignOutButton } from "./SignOutButton";

export function ParentHomeView({ data, email, demoMode = false }: { data: ParentHomeData; email: string; demoMode?: boolean }) {
  return <main className="mx-auto min-h-dvh w-full max-w-6xl px-5 py-6 md:px-8 md:py-10">
    <header className="flex items-center justify-between gap-4"><div><p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">Pebble parent</p><p className="mt-1 text-sm text-stone">{email}</p></div>{demoMode ? <Link href="/parent/login" className="rounded-full border-2 border-deep/15 px-4 py-2 text-sm font-semibold text-deep">Back to login</Link> : <SignOutButton />}</header>
    {demoMode ? <div className="mt-6 rounded-2xl border-2 border-apricot bg-apricot/20 px-4 py-3 text-sm font-semibold text-deep">Demo mode — sample children and progress. Nothing is saved.</div> : null}
    <section className="mt-10"><p className="text-sm font-semibold uppercase tracking-[0.15em] text-creek">Your family</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight text-deep md:text-5xl">Who is learning today?</h1><p className="mt-3 text-lg text-stone">Choose a child to see their learning journey and updates.</p></section>
    <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Children">
      {data.children.map((child) => <ChildCard key={child.id} child={child} demoMode={demoMode} />)}
      <article className="relative flex min-h-[280px] flex-col justify-between rounded-[28px] border-2 border-dashed border-sky bg-sky/10 p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.15em] text-creek">Growing your family?</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">Add another child</h2><p className="mt-2 max-w-[18rem] text-sm text-stone">Create a separate learning space so everyone’s progress stays organized.</p></div><div className="absolute bottom-5 right-5">{demoMode ? <Link href="/parent/login" aria-label="Log in to add another child" title="Log in to add another child" className="flex h-14 w-14 items-center justify-center rounded-full bg-sky text-4xl font-light leading-none text-deep shadow-[0_5px_0_rgba(76,93,107,0.18)] transition hover:scale-105">+</Link> : <AddChildForm compact />}</div></article>
    </section>
    {data.children.length === 0 ? <p className="mt-5 text-sm text-stone">Use the blue plus button to add the first child.</p> : null}
  </main>;
}
