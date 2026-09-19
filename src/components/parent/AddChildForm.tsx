"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddChildForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/parent/children", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, age: Number(age) }) });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) { setError(body.error ?? "We could not add that child."); return; }
    setName(""); setAge(""); setOpen(false); router.refresh();
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="Add another child" title="Add another child" className={compact ? "flex h-14 w-14 items-center justify-center rounded-full bg-sky text-4xl font-light leading-none text-deep shadow-[0_5px_0_rgba(76,93,107,0.18)] transition hover:scale-105 hover:bg-sky/80" : "min-h-12 rounded-full bg-creek px-5 py-3 font-semibold text-white"}><span aria-hidden="true">+</span>{compact ? <span className="sr-only">Add another child</span> : " Add a child"}</button>;

  return <form onSubmit={submit} className="grid gap-4 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]"><div className="flex items-start justify-between gap-4"><div><h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-deep">Add another child</h2><p className="mt-1 text-sm text-stone">Their learning stays separate from everyone else’s.</p></div><button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-stone">Cancel</button></div><label className="text-sm font-semibold text-stone">Name<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border-2 border-deep/10 bg-white px-4 py-3 text-deep outline-none focus:border-creek" /></label><label className="text-sm font-semibold text-stone">Age<input required min={2} max={18} type="number" value={age} onChange={(event) => setAge(event.target.value)} className="mt-1 w-full rounded-2xl border-2 border-deep/10 bg-white px-4 py-3 text-deep outline-none focus:border-creek" /></label>{error ? <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-900">{error}</p> : null}<button disabled={busy} className="rounded-full bg-deep px-5 py-3 font-semibold text-foam disabled:opacity-60">{busy ? "Adding…" : "Add child"}</button></form>;
}
