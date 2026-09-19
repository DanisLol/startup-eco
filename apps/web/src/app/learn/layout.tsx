import Link from "next/link";
import { exitChildMode } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { Lock } from "@/components/icons";
import { SproutMark, Wordmark } from "@/components/logo";

/** Child shell: larger type, calmer chrome, no account or billing UI. */
export default async function LearnLayout({ children }: LayoutProps<"/learn">) {
  await requireUser();
  return (
    <div className="kid-sky flex min-h-full flex-1 flex-col text-[17px]">
      <header className="mx-auto w-full max-w-4xl px-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between gap-3 rounded-full border border-line/80 bg-card/80 py-2 pr-2 pl-3 shadow-soft backdrop-blur">
          <Link href="/learn" className="flex items-center gap-2 rounded-full">
            <SproutMark className="h-9 w-9" />
            <Wordmark className="text-xl" />
          </Link>
          <form action={exitChildMode}>
            <button type="submit" className="btn-ghost btn-sm text-ink-soft">
              <Lock size={14} />
              For grown-ups
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-20">{children}</main>
    </div>
  );
}
