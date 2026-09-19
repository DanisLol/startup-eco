"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ParentResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10"><p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-deep/70">Pebble parent</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold text-deep">Choose a new password</h1><form onSubmit={async (event) => { event.preventDefault(); setError(null); const response = await fetch("/api/auth/update-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const result = (await response.json()) as { error?: string }; if (!response.ok) setError(result.error ?? "Could not update password."); else { setMessage("Password updated. Taking you to your dashboard…"); setTimeout(() => { router.push("/parent"); router.refresh(); }, 700); } }} className="mt-8 grid gap-5 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_0_rgba(76,93,107,0.12)]"><label className="text-sm font-semibold text-stone">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border-2 border-deep/10 bg-white px-4 py-3 text-deep outline-none focus:border-creek" /></label>{error ? <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-900">{error}</p> : null}{message ? <p role="status" className="rounded-2xl bg-foam px-4 py-3 text-sm text-deep">{message}</p> : null}<button className="rounded-full bg-deep px-5 py-3 font-semibold text-foam">Update password</button></form></main>;
}
