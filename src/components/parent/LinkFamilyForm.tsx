"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LinkFamilyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/parent/link-family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, phone }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "We could not link that family.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-[28px] bg-white/75 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">Connect your child</h2>
        <p className="mt-2 text-sm text-stone">Use the family code and the phone number that receives Pebble updates.</p>
      </div>
      <label className="text-sm font-semibold text-stone">Family code<input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} className="mt-1 w-full rounded-2xl border-2 border-deep/10 bg-white px-4 py-3 uppercase tracking-[0.25em] text-deep outline-none focus:border-creek" /></label>
      <label className="text-sm font-semibold text-stone">Parent phone number<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+15555550107" className="mt-1 w-full rounded-2xl border-2 border-deep/10 bg-white px-4 py-3 text-deep outline-none focus:border-creek" /></label>
      {error ? <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-900">{error}</p> : null}
      <button disabled={busy} className="rounded-full bg-creek px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Connecting…" : "Connect family"}</button>
    </form>
  );
}
