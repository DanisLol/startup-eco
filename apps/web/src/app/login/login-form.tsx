"use client";

import { useActionState, useState } from "react";
import { Lock } from "@/components/icons";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signin" ? signIn : signUp, {});

  return (
    <div className="card p-6 shadow-lift sm:p-7">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-paper-deep p-1 text-sm font-extrabold" role="tablist">
        <button type="button" role="tab" onClick={() => setMode("signin")} className={`rounded-full py-2.5 transition ${mode === "signin" ? "bg-card shadow-soft" : "text-ink-soft hover:text-ink"}`} aria-selected={mode === "signin"}>
          Sign in
        </button>
        <button type="button" role="tab" onClick={() => setMode("signup")} className={`rounded-full py-2.5 transition ${mode === "signup" ? "bg-card shadow-soft" : "text-ink-soft hover:text-ink"}`} aria-selected={mode === "signup"}>
          Create account
        </button>
      </div>
      <h2 className="text-xl font-black">{mode === "signin" ? "Welcome back" : "Start with a free account"}</h2>
      <p className="mb-5 text-sm text-ink-soft">{mode === "signin" ? "Sign in to the parent account." : "One account for the whole family."}</p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required className="input" placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"} />
        </div>
        {state.error ? <p role="alert" className="rounded-xl border border-berry/25 bg-berry-soft px-3 py-2 text-sm font-bold text-berry">{state.error}</p> : null}
        {state.message ? <p role="status" className="rounded-xl border border-brand/25 bg-brand-soft px-3 py-2 text-sm font-bold text-brand-deep">{state.message}</p> : null}
        <button type="submit" disabled={pending} className="btn-primary btn-lg w-full">
          {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
        <Lock size={12} />
        Parent account. Children use a separate, simpler screen.
      </p>
    </div>
  );
}
