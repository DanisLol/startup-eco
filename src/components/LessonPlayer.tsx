"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExplainStep } from "./ExplainStep";
import { QuizStep } from "./QuizStep";
import { ReflectStep } from "./ReflectStep";
import { StepShell } from "./StepShell";
import type { LessonArtifact, Progress } from "@/lib/types";

/**
 * Plays one lesson artifact one step at a time and fire-and-forgets progress saves.
 */
export function LessonPlayer({
  childName,
  sessionId,
  artifact,
  initialProgress,
}: {
  childName: string;
  sessionId: string;
  artifact: LessonArtifact;
  initialProgress: Progress;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [exiting, setExiting] = useState(false);

  const currentIndex = useMemo(() => {
    const firstOpen = artifact.steps.findIndex(
      (step) => !progress.completed.includes(step.id),
    );
    return firstOpen === -1 ? artifact.steps.length : firstOpen;
  }, [artifact.steps, progress.completed]);

  const finished = currentIndex >= artifact.steps.length;
  const step = artifact.steps[currentIndex];

  /**
   * Saves a step without blocking the child on the network.
   */
  function persist(
    stepId: string,
    extra?: {
      answer?: { choice: number; correct: boolean };
      reflection?: string;
    },
  ): void {
    setProgress((current) => ({
      completed: current.completed.includes(stepId)
        ? current.completed
        : [...current.completed, stepId],
      answers: extra?.answer
        ? { ...current.answers, [stepId]: extra.answer }
        : current.answers,
      reflection: extra?.reflection ?? current.reflection,
    }));
    void fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        stepId,
        answer: extra?.answer,
        reflection: extra?.reflection,
      }),
    });
  }

  /**
   * Closes the session and sends the parent debrief.
   */
  async function handleExit(): Promise<void> {
    if (exiting) return;
    setExiting(true);
    try {
      await fetch("/api/exit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } finally {
      router.push("/done");
    }
  }

  return (
    <StepShell
      childName={childName}
      stepIndex={Math.min(currentIndex, artifact.steps.length - 1)}
      stepCount={artifact.steps.length}
      onExit={() => {
        void handleExit();
      }}
    >
      {finished ? (
        <section className="flex flex-1 flex-col">
          <div className="rounded-[32px] bg-sand p-6 shadow-[0_10px_0_rgba(76,93,107,0.18)]">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-deep">
              You hopped the whole way
            </h1>
            <p className="mt-4 text-lg text-deep">{artifact.wrapUp}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleExit();
            }}
            disabled={exiting}
            className="mt-auto rounded-full bg-deep px-6 py-4 text-xl font-semibold text-foam"
          >
            {exiting ? "Telling your grown-up..." : "Tell my grown-up"}
          </button>
        </section>
      ) : step.type === "explain" ? (
        <ExplainStep
          title={step.title}
          paragraphs={step.paragraphs}
          onContinue={() => persist(step.id)}
        />
      ) : step.type === "quiz" ? (
        <QuizStep
          question={step.question}
          choices={step.choices}
          correctIndex={step.correctIndex}
          explanation={step.explanation}
          onContinue={(answer) => persist(step.id, { answer })}
        />
      ) : (
        <ReflectStep
          prompt={step.prompt}
          initialValue={progress.reflection}
          onContinue={(reflection) => persist(step.id, { reflection })}
        />
      )}
    </StepShell>
  );
}
