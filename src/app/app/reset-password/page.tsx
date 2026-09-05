"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthBackdrop, AuthBrand, AuthCardBadge } from "@/app/app/_auth/auth-chrome";
import "@/app/app/_auth/auth.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // A valid password-recovery session must already be present (set by
    // /app/auth/callback exchanging the emailed recovery code). If there is
    // no session at all, the link is missing or expired.
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setError("This reset link is invalid or has expired. Request a new one.");
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Could not update your password.");
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/"), 1200);
    } catch {
      setError("Could not update your password.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthBackdrop />
      <AuthBrand />
      <div className="auth-card">
        <AuthCardBadge />
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-sub">Choose a new password for your Auterim account.</p>

        {error && <div className="auth-alert error" role="alert">{error}</div>}
        {done && <div className="auth-alert success" role="status">Password updated. Redirecting...</div>}

        {!done && ready && !error && (
          <form onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">New password</label>
              <input id="password" className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" className="auth-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
            </div>
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
