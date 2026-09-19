import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { LogOut, Play } from "@/components/icons";
import { SproutMark, Wordmark } from "@/components/logo";

export default async function ParentLayout({ children }: LayoutProps<"/parent">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/parent" className="flex items-center gap-2.5 rounded-full pr-2">
            <SproutMark className="h-9 w-9" />
            <Wordmark className="text-xl" />
            <span className="badge bg-paper-deep text-ink-soft">Parents</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/parent" className="btn-ghost btn-sm hidden sm:inline-flex">Children</Link>
            <Link href="/learn" className="btn-primary btn-sm">
              <Play size={14} />
              Kid mode
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn-ghost btn-sm btn-icon" title={`Sign out ${user.email ?? ""}`} aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-ink-faint">Sprout only stores what lessons need. Nothing here is shown to your child.</footer>
    </div>
  );
}
