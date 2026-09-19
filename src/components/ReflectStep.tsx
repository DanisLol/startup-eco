"use client";

import { useState } from "react";

/**
 * Renders a single reflection prompt with a large textarea.
 */
export function ReflectStep({
  prompt,
  initialValue,
  onContinue,
}: {
  prompt: string;
  initialValue?: string;
  onContinue: (reflection: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight text-deep">
        {prompt}
      </h1>
      <label className="mt-6 block">
        <span className="sr-only">Your answer</span>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={5}
          placeholder="Say it in your own words..."
          className="w-full resize-none rounded-[24px] border-0 bg-foam p-5 text-lg text-deep shadow-[0_6px_0_rgba(76,93,107,0.16)] outline-none"
        />
      </label>
      <button
        type="button"
        onClick={() => onContinue(value.trim())}
        className="mt-auto rounded-full bg-deep px-6 py-4 text-xl font-semibold text-foam"
      >
        Place this stone
      </button>
    </section>
  );
}
