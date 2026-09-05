"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import "@/app/app/_auth/auth.css";

function AuterimMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="#ECEFF3">
        <rect x="10" y="10" width="44" height="9" />
        <rect x="26" y="19" width="12" height="12" />
        <rect x="26" y="33" width="12" height="12" />
        <rect x="10" y="45" width="44" height="9" />
      </g>
    </svg>
  );
}

function errorMessageFor(code: string | undefined, message: string): string {
  if (code === "provisioning_failed") return "We couldn't finish setting up your workspace. Please sign in again.";
  if (/invalid login credentials/i.test(message)) return "That email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Confirm your email address before signing in - check your inbox for the verification link.";
  return message || "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const queryError = searchParams.get("error") || undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(queryError ? errorMessageFor(queryError, "") : "");
  const [notice] = useState(searchParams.get("verified") === "1" ? "Email verified. Sign in to continue." : "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (signInError) {
        setError(errorMessageFor(undefined, signInError.message));
        setBusy(false);
        return;
      }
      router.replace(from && from.startsWith("/app") ? from : "/app");
      router.refresh();
    } catch {
      setError("Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand"><AuterimMark /> AUTERIM</div>
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Access your Auterim AI workforce.</p>

        {notice && <div className="auth-alert success" role="status">{notice}</div>}
        {error && <div className="auth-alert error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-foot">
          <Link href="/app/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-foot">
          Don&apos;t have an account? <Link href="/app/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
