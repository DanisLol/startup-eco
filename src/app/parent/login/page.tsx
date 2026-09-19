import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/parent/AuthForm";
import { getAuthenticatedParent } from "@/lib/parent-dashboard";

export const dynamic = "force-dynamic";

export default async function ParentLoginPage() {
  if (await getAuthenticatedParent()) redirect("/parent");
  return <AuthShell title="Welcome back" description="Log in to see what your child has been learning."><AuthForm mode="login" /><div className="mt-5 flex justify-between gap-4 text-sm"><Link href="/parent/forgot" className="font-semibold text-creek">Forgot password?</Link><Link href="/parent/signup" className="font-semibold text-creek">Create account</Link></div>{process.env.NODE_ENV !== "production" ? <Link href="/parent?demo=1" className="mt-6 flex min-h-12 items-center justify-center rounded-full border-2 border-apricot px-5 py-3 text-center font-semibold text-deep">Preview demo dashboard</Link> : null}</AuthShell>;
}

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10"><p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">Pebble parent</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">{title}</h1><p className="mt-3 text-lg text-stone">{description}</p><section className="mt-8 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]">{children}</section></main>;
}
