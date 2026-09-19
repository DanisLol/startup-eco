"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeFamilyCode } from "@/lib/code";

/**
 * Big family-code entry followed by a name picker for the children on that family.
 */
export function JoinForm({
  initialCode = "",
}: {
  initialCode?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(normalizeFamilyCode(initialCode));
  const [childName, setChildName] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  /**
   * Looks up the family for the typed code and shows the name picker.
   */
  async function lookupCode(): Promise<void> {
    const normalized = normalizeFamilyCode(code);
    if (normalized.length !== 6) {
      setMessage("Type all 6 letters and numbers.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data = (await response.json()) as {
        childName?: string;
        children?: string[];
        error?: string;
      };
      if (!response.ok || !data.childName) {
        setMessage(data.error ?? "That code is not in our creek.");
        return;
      }
      const nextNames = data.children?.length ? data.children : [data.childName];
      setNames(nextNames);
      setChildName(nextNames[0] ?? data.childName);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Confirms the picked name and continues into the lesson map.
   */
  async function enterLesson(): Promise<void> {
    if (!childName) return;
    setBusy(true);
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: normalizeFamilyCode(code),
          childName,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setMessage(data.error ?? "Could not hop in just now.");
        return;
      }
      router.push("/learn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-8">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">
        Pebble
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">
        Hop in with your family code
      </h1>
      <p className="mt-3 text-lg text-stone">
        Your grown-up got this code in a text. Type it on the stones.
      </p>

      <label className="mt-8 block">
        <span className="sr-only">Family code</span>
        <input
          value={code}
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
          maxLength={6}
          onChange={(event) => {
            setCode(normalizeFamilyCode(event.target.value));
            setNames([]);
            setChildName(null);
            setMessage("");
          }}
          className="w-full rounded-[28px] border-0 bg-foam px-5 py-5 text-center font-[family-name:var(--font-mono)] text-3xl font-bold tracking-[0.4em] text-deep outline-none"
          placeholder="MIA4K2"
        />
      </label>

      {names.length === 0 ? (
        <button
          type="button"
          onClick={() => {
            void lookupCode();
          }}
          disabled={busy}
          className="mt-6 rounded-full bg-deep px-6 py-4 text-xl font-semibold text-foam"
        >
          {busy ? "Looking..." : "Find my lesson"}
        </button>
      ) : (
        <div className="mt-8">
          <p className="text-lg font-semibold text-deep">Who is hopping?</p>
          <div className="mt-3 grid gap-3">
            {names.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setChildName(name)}
                className={`rounded-[22px] px-5 py-4 text-left text-xl font-semibold ${
                  childName === name
                    ? "bg-deep text-foam"
                    : "bg-foam text-deep shadow-[0_6px_0_rgba(76,93,107,0.16)]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              void enterLesson();
            }}
            disabled={busy || !childName}
            className="mt-6 w-full rounded-full bg-leaf px-6 py-4 text-xl font-semibold text-foam"
          >
            {busy ? "Opening..." : "Start hopping"}
          </button>
        </div>
      )}

      {message ? (
        <p className="mt-4 rounded-[20px] bg-sand px-4 py-3 text-lg text-deep">
          {message}
        </p>
      ) : null}
    </div>
  );
}
