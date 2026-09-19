"use client";

import { useState } from "react";

/**
 * Renders a four-choice quiz with immediate, no-penalty feedback.
 */
export function QuizStep({
  question,
  choices,
  correctIndex,
  explanation,
  onContinue,
}: {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  onContinue: (answer: { choice: number; correct: boolean }) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const answered = choice !== null;
  const correct = choice === correctIndex;

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight text-deep">
        {question}
      </h1>
      <div className="mt-6 grid gap-3">
        {choices.map((label, index) => {
          const selected = choice === index;
          const showCorrect = answered && index === correctIndex;
          const showMiss = answered && selected && !correct;
          return (
            <button
              key={label}
              type="button"
              disabled={answered}
              onClick={() => setChoice(index)}
              className={`rounded-[22px] px-5 py-4 text-left text-lg font-medium leading-snug ${
                showCorrect
                  ? "bg-leaf text-foam"
                  : showMiss
                    ? "bg-apricot text-deep"
                    : selected
                      ? "bg-deep text-foam"
                      : "bg-foam text-deep shadow-[0_6px_0_rgba(76,93,107,0.16)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className="mt-6 rounded-[24px] bg-sand p-5">
          <p className="text-lg font-semibold text-deep">
            {correct ? "Yes. That is the one." : "Close. Here is the idea."}
          </p>
          <p className="mt-2 text-lg text-deep">{explanation}</p>
        </div>
      ) : null}
      {answered ? (
        <button
          type="button"
          onClick={() =>
            onContinue({ choice: choice ?? 0, correct })
          }
          className="mt-auto rounded-full bg-deep px-6 py-4 text-xl font-semibold text-foam"
        >
          Next stone
        </button>
      ) : (
        <p className="mt-auto pt-6 text-base text-stone">Tap the one you think is right.</p>
      )}
    </section>
  );
}
