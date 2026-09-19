"use client";

import { useState } from "react";
import { HopStones } from "./HopStones";

/**
 * Shared lesson chrome: hop-stone progress, one step of content, and the exit control.
 */
export function StepShell({
  childName,
  stepIndex,
  stepCount,
  onExit,
  children,
}: {
  childName: string;
  stepIndex: number;
  stepCount: number;
  onExit: () => void;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-deep">
          {childName}&apos;s hop
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full bg-foam/80 px-4 py-2 text-base font-semibold text-stone shadow-sm"
        >
          I&apos;m done for now
        </button>
      </header>

      <HopStones total={stepCount} current={Math.min(stepIndex, stepCount - 1)} />

      <main className="mt-8 flex flex-1 flex-col">{children}</main>

      {confirming ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-deep/40 p-5 sm:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-foam p-6 shadow-xl">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-deep">
              Pause here?
            </h2>
            <p className="mt-2 text-lg text-stone">
              You can keep hopping, or finish and tell your grown-up what you did.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full bg-leaf px-5 py-3 text-lg font-semibold text-foam"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-full bg-deep px-5 py-3 text-lg font-semibold text-foam"
              >
                Finish and tell my grown-up
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
