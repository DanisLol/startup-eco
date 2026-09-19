import type { Metadata } from "next";
import { SproutMark, Wordmark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { emoji: "🎯", title: "You set the goal", body: "Write it the way you'd say it. We turn it into an ordered curriculum." },
  { emoji: "🪐", title: "They explore", body: "Every topic becomes a hands-on lesson: tap, play, discover, then a short quiz." },
  { emoji: "📈", title: "You see what stuck", body: "Mastery per objective and a plain daily summary. No guesswork about mood." },
];

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/parent";
  return (
    <main className="kid-sky flex flex-1 items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top,0px))]">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <section className="animate-rise">
          <div className="mb-6 flex items-center gap-3">
            <SproutMark className="h-12 w-12" />
            <Wordmark className="text-3xl" />
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Lessons that grow
            <br />
            <span className="text-brand">around your child.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-soft">Describe what you want them to learn. Sprout builds an interactive lesson for every topic and tells you what stuck.</p>

          <ul className="mt-8 hidden gap-3 sm:grid">
            {POINTS.map((p, i) => (
              <li key={p.title} className="card animate-rise flex items-start gap-4 py-4" style={{ animationDelay: `${120 + i * 70}ms` }}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sun-soft to-brand-soft text-2xl" aria-hidden>
                  {p.emoji}
                </span>
                <div>
                  <p className="font-extrabold">{p.title}</p>
                  <p className="text-sm text-ink-soft">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="animate-rise w-full max-w-md justify-self-center lg:justify-self-end" style={{ animationDelay: "80ms" }}>
          <LoginForm next={next} />
        </section>
      </div>
    </main>
  );
}
