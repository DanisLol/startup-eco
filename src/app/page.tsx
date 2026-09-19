import Link from "next/link";

/**
 * Parent/judge splash. Kids go straight to the family code screen.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">
        Pebble
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-tight text-deep">
        One hop at a time.
      </h1>
      <p className="mt-4 text-lg text-stone">
        A grown-up texts what you want to learn. You type a family code, pick
        your name, and hop the stones.
      </p>
      <Link
        href="/join"
        className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-deep px-6 py-4 text-center text-xl font-semibold text-foam"
      >
        I have a family code
      </Link>
      <Link
        href="/parent/login"
        className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border-2 border-deep/15 px-6 py-3 text-center text-lg font-semibold text-deep"
      >
        Parent dashboard
      </Link>
      <p className="mt-8 text-base text-stone">
        Demo code if you are on this laptop: MIA4K2. Grown-ups text the Twilio
        number with something like: Mia is 7, she loves volcanoes.
      </p>
    </main>
  );
}
