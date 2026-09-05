"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { appHref } from "@/lib/urls";
import { AuthBackdrop, AuthBrand, AuthCardBadge } from "@/app/app/_auth/auth-chrome";
import "@/app/app/_auth/auth.css";

function passwordIssue(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setError("Add your name.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) {
      setError(pwIssue);
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: trimmedName, company_name: companyName.trim() || undefined },
          emailRedirectTo: appHref("/auth/callback"),
        },
      });

      if (signUpError) {
        if (/already registered|already exists|user already/i.test(signUpError.message)) {
          setError("An account with this email already exists. Sign in instead.");
        } else {
          setError(signUpError.message || "Could not create your account.");
        }
        setBusy(false);
        return;
      }

      // If email confirmation is disabled in the Supabase project, signUp
      // already returns an active session - go straight into the app,
      // where the layout gateway provisions the workspace automatically.
      if (data.session) {
        router.replace("/app");
        router.refresh();
        return;
      }

      setAwaitingVerification(true);
      setBusy(false);
    } catch {
      setError("Could not create your account. Please try again.");
      setBusy(false);
    }
  }

  if (awaitingVerification) {
    return (
      <div className="auth-shell">
        <AuthBackdrop />
        <AuthBrand />
        <div className="auth-card">
          <AuthCardBadge />
          <h1 className="auth-title">Check your inbox</h1>
          <p className="auth-sub">
            We sent a verification link to <strong style={{ color: "var(--ink)" }}>{email.trim()}</strong>.
            Confirm your email to finish creating your account and set up your workspace.
          </p>
          <div className="auth-foot">
            Already verified? <Link href="/app/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <AuthBackdrop />
      <AuthBrand />
      <div className="auth-card">
        <AuthCardBadge />
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Set up the AI workforce for your business.</p>

        {error && <div className="auth-alert error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="fullName">Your name</label>
            <input id="fullName" className="auth-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="companyName">Company name (optional)</label>
            <input id="companyName" className="auth-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." autoComplete="organization" />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Work email</label>
            <input id="email" className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input id="password" className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-foot">
          Already have an account? <Link href="/app/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
