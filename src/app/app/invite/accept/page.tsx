"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptInviteAction } from "./actions";
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

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("invite") || "";
  const [status, setStatus] = useState<"checking" | "needs_login" | "error" | "done">(token ? "checking" : "error");
  const [message, setMessage] = useState(token ? "" : "This invite link is missing its token.");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    acceptInviteAction(token).then((result) => {
      if (cancelled) return;
      if (result.status === "unauthenticated") {
        setStatus("needs_login");
        return;
      }
      if (result.status === "error") {
        setStatus("error");
        setMessage(result.message);
        return;
      }
      setStatus("done");
      setTimeout(() => router.replace("/app"), 900);
    });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const loginHref = `/app/login?from=${encodeURIComponent(`/app/invite/accept?token=${token}`)}`;

  return (
    <div className="auth-shell">
      <div className="auth-brand"><AuterimMark /> AUTERIM</div>
      <div className="auth-card">
        <h1 className="auth-title">Team invite</h1>

        {status === "checking" && <p className="auth-sub">Checking your invite...</p>}

        {status === "needs_login" && (
          <>
            <p className="auth-sub">Sign in (or create an account) with the email this invite was sent to, then we&apos;ll add you to the workspace automatically.</p>
            <Link className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={loginHref}>
              Sign in to accept
            </Link>
          </>
        )}

        {status === "error" && <div className="auth-alert error" role="alert">{message}</div>}

        {status === "done" && <div className="auth-alert success" role="status">Invite accepted. Taking you to your workspace...</div>}
      </div>
    </div>
  );
}
