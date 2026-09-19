"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup" | "forgot";

type AuthResponse = { error?: string; needsConfirmation?: boolean };

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const endpoint = mode === "login" ? "/api/auth/login" : mode === "signup" ? "/api/auth/signup" : "/api/auth/reset";
    const payload = mode === "forgot" ? { email } : { email, password };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await response.json()) as AuthResponse;
      if (!response.ok) {
        setError(result.error ?? "We could not complete that request.");
        return;
      }
      if (mode === "forgot") {
        setMessage("If that email is registered, a password reset link is on its way.");
        return;
      }
      if (mode === "signup" && result.needsConfirmation) {
        setMessage("Check your email to confirm your account, then come back to log in.");
        return;
      }
      router.push("/parent");
      router.refresh();
    } catch {
      setError("The server is unavailable. Check that the app is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your parent account" : "Reset your password";
  const submitLabel = mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link";

  return <form onSubmit={submit} className="grid gap-5">
    <div><label htmlFor="parent-email" className="block text-sm font-semibold text-stone">Email</label><input id="parent-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border-2 border-deep/10 bg-white/80 px-4 py-3 text-deep outline-none focus:border-creek" /></div>
    {mode !== "forgot" ? <div><label htmlFor="parent-password" className="block text-sm font-semibold text-stone">Password</label><input id="parent-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border-2 border-deep/10 bg-white/80 px-4 py-3 text-deep outline-none focus:border-creek" /></div> : null}
    {error ? <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-900">{error}</p> : null}
    {message ? <p role="status" className="rounded-2xl bg-foam px-4 py-3 text-sm text-deep">{message}</p> : null}
    <button disabled={busy} className="min-h-12 rounded-full bg-deep px-5 py-3 font-semibold text-foam disabled:opacity-60">{busy ? "Working…" : submitLabel}</button>
    <p className="sr-only">{title}</p>
  </form>;
}
