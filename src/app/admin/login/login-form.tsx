"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm({ from }: { from: string }) {
  const [state, formAction, isPending] = useActionState(login, {
    error: null,
  });

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="from" value={from} />

      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
