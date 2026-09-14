import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AuthBackdrop, AuthBrand, AuthCardBadge } from "@/app/app/_auth/auth-chrome";
import { EARLY_ACCESS_INVITE_COOKIE, getEarlyAccessInvitePreview, logEarlyAccessInviteEvent } from "@/lib/early-access/invites";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { acceptEarlyAccessInviteAction, continueAfterAcceptedEarlyAccessInviteAction, switchEarlyAccessAccountAction } from "./actions";
import "@/app/app/_auth/auth.css";

export const metadata: Metadata = {
  title: "Accept Early Access | Auterim",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ error?: string }> };
const continuePath = "/early-access/accept/session";
const date = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return <div className={`auth-alert ${tone}`} role="status">{children}</div>;
}

export default async function EarlyAccessAcceptPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(EARLY_ACCESS_INVITE_COOKIE)?.value ?? null;
  const invite = await getEarlyAccessInvitePreview(token);
  const user = await getVerifiedSupabaseUser().catch(() => null);

  if (invite?.state === "valid") logEarlyAccessInviteEvent("early_access_invite_opened", { inviteId: invite.inviteId, requestId: invite.requestId });
  if (invite?.state === "expired") logEarlyAccessInviteEvent("early_access_invite_expired", { inviteId: invite.inviteId, requestId: invite.requestId });

  const emailMatches = Boolean(user?.email && invite && user.email.trim().toLowerCase() === invite.emailNormalized);
  const emailVerified = Boolean(user?.email_confirmed_at);
  const returnPath = token ? `/early-access/accept?token=${encodeURIComponent(token)}` : continuePath;
  const loginHref = `/login?from=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?from=${encodeURIComponent(returnPath)}`;
  const errorMessage: Record<string, string> = {
    expired: "This invite has expired. Contact support and we can help you request a fresh invitation.",
    revoked: "This invite is no longer active. Contact support if you still need Early Access.",
    "email-mismatch": "This invite was issued to a different email address.",
    "email-unverified": "Verify your email address before accepting this invite.",
    accepted: "This invite has already been accepted. Sign in with the account that accepted it.",
    invalid: "This invite link is not valid. Ask Auterim for a fresh invitation.",
    unavailable: "This invite could not be validated. Contact support for help.",
  };

  let content: React.ReactNode;
  if (query.error && errorMessage[query.error]) {
    content = <Alert>{errorMessage[query.error]}</Alert>;
  } else if (!invite) {
    content = <><Alert>This invite link is not valid or is no longer available.</Alert><p className="auth-sub">For help, contact <a href="mailto:hello@auterim.com">Auterim support</a>.</p></>;
  } else if (invite.state === "expired") {
    content = <><Alert>This invite has expired.</Alert><p className="auth-sub">Contact <a href="mailto:hello@auterim.com">Auterim support</a> to request a fresh invitation.</p></>;
  } else if (invite.state === "revoked" || invite.state === "unavailable") {
    content = <><Alert>This invite is no longer active.</Alert><p className="auth-sub">Contact <a href="mailto:hello@auterim.com">Auterim support</a> if you still need Early Access.</p></>;
  } else if (invite.state === "pending") {
    content = <><Alert tone="success">Your invite is being prepared.</Alert><p className="auth-sub">Refresh this page in a moment. No workspace or trial has been started.</p></>;
  } else if (invite.state === "accepted" && user?.id === invite.acceptedUserId) {
    content = <><Alert tone="success">This invite has already been accepted.</Alert><p className="auth-sub">Your workspace is ready. Continue to onboarding and pick up where you left off.</p><form action={continueAfterAcceptedEarlyAccessInviteAction}><button className="auth-submit" type="submit">Continue to your workspace</button></form></>;
  } else if (invite.state === "accepted") {
    content = <><Alert>This invite has already been accepted.</Alert><p className="auth-sub">Sign in with the account used to accept it to continue to your Auterim workspace.</p><Link className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={loginHref}>Sign in</Link></>;
  } else if (!user) {
    content = <>
      <p className="auth-sub">Your request has been approved. This invite is for <strong style={{ color: "var(--ink)" }}>{invite.maskedEmail}</strong> and expires {date(invite.expiresAt)}.</p>
      <Link className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={loginHref}>Sign in</Link>
      <div className="auth-foot">New to Auterim? <Link href={registerHref}>Create an account</Link></div>
    </>;
  } else if (!emailMatches) {
    content = <>
      <Alert>This invite was issued to a different email address.</Alert>
      <p className="auth-sub">Sign out, then sign in or create an account using the invited email address.</p>
      <form action={switchEarlyAccessAccountAction}><button className="auth-submit" type="submit">Switch account</button></form>
    </>;
  } else if (!emailVerified) {
    content = <>
      <Alert>Verify your email address before accepting this invite.</Alert>
      <p className="auth-sub">Complete the verification link from Supabase Auth, then return here to finish setting up your workspace.</p>
      <form action={switchEarlyAccessAccountAction}><button className="auth-secondary" type="submit">Switch account</button></form>
    </>;
  } else {
    content = <>
      <p className="auth-sub">Your request has been approved for <strong style={{ color: "var(--ink)" }}>{invite.company}</strong>. The invitation is tied to your verified email and expires {date(invite.expiresAt)}.</p>
      <form action={acceptEarlyAccessInviteAction}><button className="auth-submit" type="submit">Set up your workspace</button></form>
      <p className="auth-foot">Your trial will not start automatically. You’ll choose when to start it inside Auterim.</p>
    </>;
  }

  return (
    <div className="auth-shell">
      <AuthBackdrop />
      <AuthBrand />
      <main className="auth-card" aria-labelledby="early-access-accept-title">
        <AuthCardBadge />
        <p className="admin-eyebrow">Auterim Early Access</p>
        <h1 id="early-access-accept-title" className="auth-title">You’re invited to Auterim.</h1>
        {content}
      </main>
    </div>
  );
}
