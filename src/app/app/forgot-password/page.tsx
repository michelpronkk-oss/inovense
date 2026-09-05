"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorDiagnostics, authErrorMessage } from "@/lib/supabase/auth-errors";
import { appHref } from "@/lib/urls";
import { AuthBackdrop, AuthBrand, AuthCardBadge } from "@/app/app/_auth/auth-chrome";
import "@/app/app/_auth/auth.css";

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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: appHref("/auth/callback?next=/reset-password"),
      });
      if (resetError) {
        console.warn("[auth.password-reset] failed", authErrorDiagnostics(resetError));
        setError(authErrorMessage(resetError, "reset"));
        return;
      }
      // Always show the same confirmation, whether or not the email exists,
      // so this cannot be used to enumerate registered accounts.
      setSent(true);
    } catch (resetError) {
      console.warn("[auth.password-reset] failed", authErrorDiagnostics(resetError));
      setError(authErrorMessage(resetError, "reset"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthBackdrop />
      <AuthBrand />
      <div className="auth-card">
        <AuthCardBadge />
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
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
