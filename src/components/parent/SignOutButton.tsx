"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return <button type="button" onClick={async () => { await fetch("/api/auth/signout", { method: "POST" }); router.push("/parent/login"); router.refresh(); }} className="rounded-full border-2 border-deep/15 px-4 py-2 text-sm font-semibold text-deep hover:bg-white/70">Sign out</button>;
}
