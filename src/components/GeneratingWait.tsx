"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes a generating lesson until the artifact is ready.
 */
export function GeneratingWait({ childName }: { childName: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-8">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">
        {childName}&apos;s creek
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
        Stacking your stones
      </h1>
      <p className="mt-4 text-lg text-stone">
        Your grown-up asked for a lesson. We are lining up the hop. Stay on this
        page.
      </p>
      <div className="mt-10 flex justify-center gap-3">
        <span className="h-6 w-10 animate-pulse rounded-full bg-deep" />
        <span className="h-5 w-8 animate-pulse rounded-full bg-creek" />
        <span className="h-5 w-8 animate-pulse rounded-full bg-sand" />
      </div>
    </div>
  );
}
