/**
 * Code-owned auth-adjacent emails. These are sent via Resend from server
 * actions/routes in this app (not from the Supabase dashboard).
 *
 * Currently: the team workspace invite email and the Early Access workspace
 * invitation sent by an internal admin.
 */
import { getMarketingUrl } from "@/lib/urls";
import { renderAuterimEmailHtml, renderAuterimEmailText } from "./auterim-email-layout";

function auterimLogoUrl(): string {
  // Self-contained rounded PNG badge (dark background baked into the asset
  // itself), safe across light/dark email clients. Do not swap for the SVG
  // mark -- SVG support in email clients is inconsistent.
  return `${getMarketingUrl()}/brand/auterim-icon-32.png`;
}

export type TeamInviteEmailInput = {
  workspaceName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export function renderTeamInviteEmail(input: TeamInviteEmailInput): RenderedEmail {
  const subject = "You've been invited to Auterim";

  const content = {
    preheader: "Accept your invitation to join an Auterim workspace.",
    eyebrow: "Workspace invite",
    heading: "Join your Auterim workspace",
    bodyParagraphs: [
      `${input.inviterName} invited you to join ${input.workspaceName} on Auterim as ${input.role}.`,
      "You've been invited to join a workspace in Auterim.",
    ],
    ctaText: "Accept invitation",
    ctaHref: input.acceptUrl,
    secondaryNote: "This invitation is tied to the email address it was sent to.",
    securityNote: "If you weren't expecting this invitation, you can ignore this email.",
    logoUrl: auterimLogoUrl(),
  };

  return {
    subject,
    html: renderAuterimEmailHtml(content),
    text: renderAuterimEmailText(content),
  };
}

export type EarlyAccessInviteEmailInput = {
  firstName: string;
  acceptUrl: string;
};

export function renderEarlyAccessInviteEmail(input: EarlyAccessInviteEmailInput): RenderedEmail {
  const firstName = input.firstName.trim().split(/\s+/)[0] || "there";
  const subject = "Your Auterim Early Access invite";
  const content = {
    preheader: "Your Early Access request has been approved. Set up your Auterim workspace.",
    eyebrow: "Early Access",
    heading: "You’re invited to Auterim.",
    bodyParagraphs: [
      `Hi ${firstName},`,
      "Your Early Access request has been approved.",
      "Set up your workspace, connect the systems your business already uses, and choose which Operators you want to configure first.",
    ],
    ctaText: "Set up your workspace",
    ctaHref: input.acceptUrl,
    secondaryNote: "Your trial will not start automatically. You’ll choose when to start it inside Auterim.",
    securityNote: "This one-time invite is tied to the email address it was sent to and expires in seven days. If you did not request Early Access, you can ignore this email.",
    logoUrl: auterimLogoUrl(),
  };
  return { subject, html: renderAuterimEmailHtml(content), text: renderAuterimEmailText(content) };
}
