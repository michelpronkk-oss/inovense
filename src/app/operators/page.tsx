import type { Metadata } from "next";
import Image from "next/image";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicCta } from "@/components/home-v3/public-page-components";
import { OperatorsHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import { OperatorProfileGrid } from "@/components/home-v3/public-story-components";
import { operatorAvatarPath } from "@/lib/operator-assets";
import { ROADMAP_OPERATOR_PRESENTATION } from "@/lib/operators/index-card-presentation";
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
    body: "Keeps inbound opportunity follow-up moving across active deals.",
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
    body: "Keeps onboarding, delivery coordination, and client handoffs moving.",
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
    body: "Moves blocked work and internal follow-through toward a clear owner.",
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
    body: "Keeps unresolved customer issues and escalations in view.",
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

export default function OperatorsPage() {
  return <PublicSiteFrame>
    <PublicHero action label="The AI workforce" title="Operators are roles, not chatbots." description="Purpose-built roles monitor approved context, prepare useful work, and move it forward inside your rules." secondary={{ label: "See how they work", href: "/how-it-works" }} visual={<OperatorsHeroVisual operators={currentOperators} />} />
    <section className="public-story operator-collection"><div className="wrap">
      <div className="public-story-heading"><span className="lbl">Available today</span><h2>Four roles. Four kinds of work.</h2><p>Each Operator has a clear responsibility and an approval boundary shaped by connected systems, granted scopes, and workspace policy.</p></div>
      <OperatorProfileGrid operators={currentOperators} />
    </div></section>
    <section className="public-story operator-behavior"><div className="wrap">
      <div className="public-story-heading"><span className="lbl">How Operators work</span><h2>Context first. Action inside policy.</h2></div>
      <div className="operator-behavior-grid"><article><span>01</span><h3>Approved context</h3><p>Operators work from the systems and information a workspace connects.</p></article><article><span>02</span><h3>A prepared next step</h3><p>Each role turns a signal into a specific piece of work for its owner.</p></article><article><span>03</span><h3>A visible boundary</h3><p>Allowed actions proceed. Gated actions pause. Blocked actions stop.</p></article></div>
    </div></section>
    <div className="wrap"><aside className="operator-roadmap" aria-labelledby="operator-roadmap-title">
      <div className="operator-roadmap-heading"><div><span className="lbl">Roadmap · coming later</span><h2 id="operator-roadmap-title">More areas of work, over time.</h2></div><span className="operator-roadmap-count">{ROADMAP_OPERATOR_PRESENTATION.length} planned roles</span></div>
      <div className="operator-roadmap-grid">{ROADMAP_OPERATOR_PRESENTATION.map((role) => <article className="operator-roadmap-card" key={role.name}>
        <Image className="operator-roadmap-avatar" src={operatorAvatarPath(role.avatarKey)} alt="" width={40} height={40} aria-hidden />
        <span className="operator-roadmap-copy"><strong>{role.name}</strong><span>{role.descriptor}</span></span>
        <span className="operator-roadmap-state">Planned</span>
      </article>)}</div>
    </aside></div>
    <PublicCta title="Start with one responsibility that already has an owner." description="Tell us which work loop you want an Operator to support. Early Access requests are reviewed before workspace invitations are sent." />
  </PublicSiteFrame>;
}
