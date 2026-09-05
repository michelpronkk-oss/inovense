/**
 * Code-owned auth-adjacent emails. These are sent via Resend from server
 * actions/routes in this app (not from the Supabase dashboard).
 *
 * Currently: the team workspace invite email
 * (`src/app/app/team/actions.ts` -> `inviteWorkspaceMember`).
 */
import { getMarketingUrl } from "@/lib/urls";
import { renderAuterimEmailHtml, renderAuterimEmailText } from "./auterim-email-layout";

function auterimLogoUrl(): string {
  // Self-contained rounded PNG badge (dark background baked into the asset
  // itself), safe across light/dark email clients. Do not swap for the SVG
  // mark -- SVG support in email clients is inconsistent.
  return `${getMarketingUrl()}/brand/auterim-icon-64.png`;
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
