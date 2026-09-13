import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows, PublicCta } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim AI Operators for Business";
const description = "Meet the four current Auterim Operators for revenue, client flow, operations, and support, with their responsibilities, connector scope, and approval boundaries.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/operators" },
  openGraph: { url: "https://auterim.com/operators", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/operators")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/operators")] },
  robots: { index: true, follow: true },
};

const currentOperators = [
  {
    kicker: "Revenue · available today",
    title: "Revenue Operator",
    body: "Owns inbound opportunity follow-up and the signals around active deals.",
    bullets: [
      "Watches: connected email and CRM context.",
      "Detects: pricing intent, stalled opportunities, and follow-up needs.",
      "Prepares: relevant email drafts and CRM updates from available context.",
      "Can execute: approved email sends and supported HubSpot writes. Salesforce is read-context only today.",
      "Requires approval: external email and HubSpot record changes.",
      "Example outcome: a qualified open deal receives a prepared next follow-up for its owner.",
    ],
  },
  {
    kicker: "Client Flow · available today",
    title: "Client Flow Operator",
    body: "Owns client onboarding communication, delivery coordination, and handoff momentum.",
    bullets: [
      "Watches: connected email, calendar, files, and workspace handoff context where available.",
      "Detects: missing onboarding steps, unanswered client follow-up, and delivery handoff gaps.",
      "Prepares: onboarding summaries, draft updates, and handoff checklists.",
      "Can execute: supported approved messages and actions in connected systems.",
      "Requires approval: client-facing messages, invitations, and provider writes that are gated.",
      "Example outcome: an owner receives a prepared client handoff with the open items called out.",
    ],
  },
  {
    kicker: "Operations · available today",
    title: "Operations Operator",
    body: "Owns internal operational follow-through and stalled work across supported work systems.",
    bullets: [
      "Watches: connected Trello work and allowed team communication context.",
      "Detects: blocked, overdue, or stalled cards and relevant internal signals.",
      "Prepares: a card action, work summary, internal update, or escalation.",
      "Can execute: supported approved Trello changes and internal Slack messages.",
      "Requires approval: provider writes and team messages configured behind an approval gate.",
      "Example outcome: a blocked Trello task reaches its owner with the blocker and suggested next step.",
    ],
  },
  {
    kicker: "Support · available today",
    title: "Support Operator",
    body: "Owns unresolved support work, technical issues, and escalation follow-through.",
    bullets: [
      "Watches: connected support ticket and email context where the workspace has granted access.",
      "Detects: unresolved ticket risk, escalation signals, and approaching service targets in available context.",
      "Prepares: a bounded reply, ticket update, or escalation summary.",
      "Can execute: supported approved replies and ticket actions through connected providers.",
      "Requires approval: customer-facing replies, ticket updates, and external escalations when policy requires it.",
      "Example outcome: an unresolved customer issue is surfaced with a prepared response for review.",
    ],
  },
];

const roadmap = ["Finance", "Marketing", "Recruiting", "Procurement", "Compliance", "Data"];

export default function OperatorsPage() {
  return <PublicSiteFrame>
    <PublicHero label="The AI workforce" title="Operators are roles, not chatbots." description="Each Operator owns a defined area of business work, monitors approved context, prepares a useful next step, and follows the permissions and approval policy of its workspace." secondary={{ label: "See how it works", href: "/how-it-works" }} />
    <PublicRows label="Available today" title="Four current roles, each with a focused responsibility." description="The exact capabilities depend on the connected provider, granted scopes, workspace policy, and readiness of the role." rows={currentOperators} />
    <PublicRows label="Continue exploring" title="See the systems, policies, and setup around each role." rows={[{ kicker: "Product detail", title: "From connection to controlled work.", body: "Review which systems can be connected, how approvals are evaluated, how workflows proceed, and what to expect during setup.", links: [{ label: "Connectors", href: "/connectors" }, { label: "Approval boundaries", href: "/approvals" }, { label: "Controlled workflows", href: "/workflows" }, { label: "Getting started", href: "/getting-started" }, { label: "Pricing", href: "/pricing" }, { label: "Integration catalog", href: "/integrations" }] }]} />
    <PublicRows label="Roadmap" title="A workforce that can expand over time." rows={[{ kicker: "Planned roles", title: "Future operator areas", body: "These roles are planned areas of expansion. They are not presented as currently available Operators.", bullets: roadmap }]} />
    <PublicCta title="Start with one responsibility that already has an owner." description="Tell us which work loop you want an Operator to support. Early Access requests are reviewed before workspace invitations are sent." />
  </PublicSiteFrame>;
}
