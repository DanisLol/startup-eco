"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChildSummary } from "@/lib/types";

export function ChildCard({ child, demoMode = false }: { child: ChildSummary; demoMode?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const percent = child.stepsTotal ? Math.round((child.stepsCompleted / child.stepsTotal) * 100) : 0;

  async function deleteChild() {
    if (demoMode) {
      router.push("/parent/login");
      return;
    }
    if (!window.confirm(`Remove ${child.name} from your family? Their profile and associated lessons will be deleted.`)) return;
    setBusy(true);
    const response = await fetch(`/api/parent/children/${child.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      window.alert("We could not remove that child. Please try again.");
      return;
    }
    router.refresh();
  }

  return <article className="relative rounded-[28px] bg-white/80 p-6 pb-20 shadow-[0_8px_0_rgba(76,93,107,0.12)] transition hover:-translate-y-1 hover:shadow-[0_12px_0_rgba(76,93,107,0.16)]">
    <Link href={`/parent/children/${child.id}${demoMode ? "?demo=1" : ""}`} className="group block rounded-2xl focus:outline-none focus:ring-4 focus:ring-creek/30" aria-label={`View ${child.name}'s progress`}>
      <div className="flex items-start justify-between gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl font-bold text-deep">{child.name.slice(0, 1).toUpperCase()}</div><span className="rounded-full bg-foam px-3 py-1 text-xs font-semibold text-stone">Age {child.age}</span></div>
      <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">{child.name}</h2>
      <p className="mt-1 text-sm text-stone">{child.currentTopic ?? "Ready to start learning"}</p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-creek" style={{ width: `${percent}%` }} /></div>
      <div className="mt-2 flex justify-between text-sm text-stone"><span>{percent}% journey progress</span><span>{child.sessionsCompleted} session{child.sessionsCompleted === 1 ? "" : "s"}</span></div>
      <p className="mt-5 text-sm font-semibold text-creek group-hover:underline">View progress →</p>
    </Link>
    <button type="button" onClick={deleteChild} disabled={busy} aria-label={demoMode ? "Log in to delete a child" : `Delete ${child.name}`} title={demoMode ? "Log in to manage children" : `Delete ${child.name}`} className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60">
      <span aria-hidden="true" className="text-xl leading-none">{busy ? "…" : "🗑"}</span>
    </button>
  </article>;
}
