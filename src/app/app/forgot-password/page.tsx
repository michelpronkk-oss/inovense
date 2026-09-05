"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { appHref } from "@/lib/urls";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter the email address on your account.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: appHref("/auth/callback?next=/reset-password"),
      });
      // Always show the same confirmation, whether or not the email exists,
      // so this cannot be used to enumerate registered accounts.
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand"><AuterimMark /> AUTERIM</div>
      <div className="auth-card">
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-sub">We&apos;ll email you a link to set a new password.</p>

        {error && <div className="auth-alert error" role="alert">{error}</div>}
        {sent ? (
          <div className="auth-alert success" role="status">
            If an account exists for {email.trim() || "that email"}, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input id="email" className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </div>
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <div className="auth-foot">
          <Link href="/app/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
