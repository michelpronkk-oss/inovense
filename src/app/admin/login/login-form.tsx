"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (signInError) { setError("Sign-in failed. Use an authorized Auterim account."); setBusy(false); return; }
    router.replace(from); router.refresh();
  }
  return <form onSubmit={submit} noValidate className="space-y-5"><div><label htmlFor="email" className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-200 outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30" /></div><div><label htmlFor="password" className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Password</label><input id="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-200 outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30" /></div>{error && <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-400" role="alert">{error}</p>}<button type="submit" disabled={busy} className="mt-1 w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button></form>;
}
