import Image from "next/image";
import { ArrowDown, ArrowRight, BookOpen, Check, CircleHelp, Clock3, KeyRound, Mail, MessageSquareText, ShieldCheck, UserRoundCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { ProviderLogo } from "@/components/connectors/provider-logo";
import { OperatorAvatar } from "@/components/operators/avatar";
import { GLYPHS, OPERATORS } from "@/data/operators";
import type { ChangelogRelease } from "@/data/changelog";
import type { PricingPlan } from "@/lib/pricing";

type OperatorRoleSummary = {
  title: string;
  body: string;
};

export function OperatorsHeroVisual({ operators }: { operators: OperatorRoleSummary[] }) {
  const roleNames = operators.map((operator) => operator.title);

  return (
    <div
      className="public-page-hero-visual operator-roster-visual"
      role="group"
      aria-label={`Current Auterim Operator roster: ${roleNames.join(", ")}. Each role has its own responsibility and approval boundary.`}
    >
      <div className="operator-roster-heading">
        <span>Current operator roster</span>
        <strong><i aria-hidden="true" />{String(operators.length).padStart(2, "0")} available today</strong>
      </div>
      <div className="operator-roster-list">
        {operators.map((operator, index) => {
          const identity = OPERATORS.find((candidate) => candidate.name === operator.title);
          if (!identity) return null;

          return (
            <div
              className="operator-roster-row"
              key={operator.title}
              style={{ "--operator-accent": identity.color } as CSSProperties}
            >
              <OperatorAvatar color={identity.color} glyph={GLYPHS[identity.glyph]} size={38} />
              <div className="operator-roster-copy">
                <span>{String(index + 1).padStart(2, "0")} / CURRENT ROLE</span>
                <strong>{operator.title}</strong>
                <p>{operator.body}</p>
              </div>
              <span className="operator-roster-state">Available</span>
            </div>
          );
        })}
      </div>
      <div className="operator-roster-boundary">
        <ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" />
        <span><strong>Approval-aware roles</strong><small>Boundaries follow workspace policy.</small></span>
      </div>
    </div>
  );
}

export function SecurityHeroVisual() {
  return (
    <div
      className="public-page-hero-visual security-hero-visual"
      role="img"
      aria-label="Security controls visual: verified identity, scoped connector access, workspace policy decisions, and reviewable activity."
    >
      <div className="security-visual-head">
        <span>Security model</span>
        <span><i aria-hidden="true" /> Workspace controls</span>
      </div>
      <div className="security-control-stack">
        <div className="security-control-row">
          <span className="security-control-icon"><UserRoundCheck size={17} aria-hidden="true" /></span>
          <span><small>01 / IDENTITY</small><strong>Authenticated session</strong></span>
          <Check size={15} aria-hidden="true" />
        </div>
        <div className="security-control-row">
          <span className="security-control-icon"><KeyRound size={17} aria-hidden="true" /></span>
          <span><small>02 / CONNECTORS</small><strong>Scoped provider access</strong></span>
          <Check size={15} aria-hidden="true" />
        </div>
        <div className="security-control-row">
          <span className="security-control-icon"><ShieldCheck size={17} aria-hidden="true" /></span>
          <span><small>03 / WORKSPACE</small><strong>Policy before action</strong></span>
          <ArrowRight size={15} aria-hidden="true" />
        </div>
      </div>
      <div className="security-policy-result">
        <div className="security-policy-heading"><span>Policy outcome</span><small>SET BY WORKSPACE</small></div>
        <div className="security-policy-paths">
          <span className="is-proceed"><i aria-hidden="true" />Proceed</span>
          <span className="is-review"><i aria-hidden="true" />Approval</span>
          <span className="is-blocked"><i aria-hidden="true" />Blocked</span>
        </div>
      </div>
      <div className="security-activity-line">
        <span><Clock3 size={14} aria-hidden="true" /> Decision and run activity</span>
        <span>REVIEWABLE</span>
      </div>
    </div>
  );
}

export function AboutHeroVisual() {
  return (
    <div
      className="public-page-hero-visual about-hero-visual"
      role="img"
      aria-label="Auterim brings customer, CRM, and team context together to prepare a next step with its owner and policy boundary."
    >
      <div className="about-visual-head">
        <span>Business context</span>
        <span>Understand before action</span>
      </div>
      <div className="about-context-sources">
        <div className="about-context-row"><ProviderLogo connectorKey="gmail" box={34} size={19} radius={8} /><span><small>CUSTOMER</small><strong>Conversation</strong></span><span className="about-context-state">Connected</span></div>
        <div className="about-context-row"><ProviderLogo connectorKey="hubspot" box={34} size={19} radius={8} /><span><small>RELATIONSHIP</small><strong>CRM history</strong></span><span className="about-context-state">Connected</span></div>
        <div className="about-context-row"><ProviderLogo connectorKey="trello" box={34} size={19} radius={8} /><span><small>TEAM</small><strong>Current task</strong></span><span className="about-context-state">Connected</span></div>
      </div>
      <div className="about-context-join" aria-hidden="true"><span /><ArrowDown size={16} /></div>
      <div className="about-auterim-core">
        <span className="about-brand-mark"><Image src="/brand/auterim-mark-live.svg" alt="" width={24} height={24} /></span>
        <span><small>OPERATING LAYER</small><strong>Auterim</strong></span>
        <p>Context, ownership, and policy in one view.</p>
      </div>
      <div className="about-prepared-work">
        <div><span>Prepared next step</span><strong>Follow up with the full picture.</strong></div>
        <span className="about-owner"><UserRoundCheck size={14} aria-hidden="true" /> Owner stays in control</span>
      </div>
    </div>
  );
}

export function ContactHeroVisual() {
  return (
    <div
      className="public-page-hero-visual contact-hero-visual"
      role="img"
      aria-label="Ways to contact Auterim: general questions at hello@auterim.com, account help at support@auterim.com, or request Early Access."
    >
      <div className="contact-visual-head">
        <span>Start the right conversation</span>
        <span>DIRECT ROUTES</span>
      </div>
      <div className="contact-message-preview">
        <div className="contact-message-meta"><span><MessageSquareText size={15} aria-hidden="true" /> A note to Auterim</span><span>YOUR CONTEXT</span></div>
        <div className="contact-message-lines" aria-hidden="true"><i /><i /><i /></div>
        <p>Work context helps us send your message to the right place.</p>
      </div>
      <div className="contact-route-list">
        <div className="contact-route-row">
          <span className="contact-route-icon"><Mail size={16} aria-hidden="true" /></span>
          <span><small>GENERAL</small><strong>hello@auterim.com</strong></span>
          <ArrowRight size={15} aria-hidden="true" />
        </div>
        <div className="contact-route-row">
          <span className="contact-route-icon"><CircleHelp size={16} aria-hidden="true" /></span>
          <span><small>ACCOUNT SUPPORT</small><strong>support@auterim.com</strong></span>
          <ArrowRight size={15} aria-hidden="true" />
        </div>
        <div className="contact-route-row contact-route-early-access">
          <span className="contact-route-icon"><ShieldCheck size={16} aria-hidden="true" /></span>
          <span><small>EARLY ACCESS</small><strong>Share the work you want to move</strong></span>
          <ArrowRight size={15} aria-hidden="true" />
        </div>
      </div>
      <div className="contact-visual-foot"><i aria-hidden="true" /> No passwords or access tokens</div>
    </div>
  );
}

export function PricingHeroVisual({ plans }: { plans: PricingPlan[] }) {
  const maxRuns = Math.max(...plans.map((plan) => plan.metadata.actions_limit));

  return (
    <div
      className="public-page-hero-visual pricing-hero-visual"
      role="img"
      aria-label={`Monthly Auterim plans: ${plans.map((plan) => `${plan.plan_name} ${plan.price}${plan.period}, up to ${plan.metadata.operators_limit} operators, ${plan.metadata.connectors_limit} connected systems, and ${plan.metadata.actions_limit.toLocaleString()} controlled runs`).join("; ")}. An Early Access request does not start a trial.`}
    >
      <div className="pricing-visual-head"><span>Capacity by plan</span><span>MONTHLY / USD</span></div>
      <div className="pricing-tier-list">
        {plans.map((plan, index) => (
          <div className={`pricing-tier-row${plan.featured ? " is-featured" : ""}`} key={plan.plan_tier}>
            <div className="pricing-tier-primary">
              <span className="pricing-tier-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="pricing-tier-name">{plan.plan_name}{plan.badge && <small>{plan.badge}</small>}</span>
              <strong className="pricing-tier-price">{plan.price}<small>{plan.period}</small></strong>
            </div>
            <div className="pricing-tier-capacity">
              <span><strong>{plan.metadata.operators_limit}</strong> operators</span>
              <span><strong>{plan.metadata.connectors_limit}</strong> systems</span>
              <span><strong>{plan.metadata.actions_limit.toLocaleString()}</strong> controlled runs</span>
            </div>
            <div className="pricing-tier-meter" style={{ "--tier-capacity": `${Math.max(8, plan.metadata.actions_limit / maxRuns * 100)}%` } as CSSProperties}><i /></div>
          </div>
        ))}
      </div>
      <div className="pricing-visual-foot"><ShieldCheck size={15} aria-hidden="true" /><span>Trial starts only when an invited workspace chooses it.</span></div>
    </div>
  );
}

const ONBOARDING_MILESTONES = [
  { title: "Request considered", note: "A request is not an account", state: "01" },
  { title: "Workspace invited", note: "If the use case fits", state: "02" },
  { title: "First systems connected", note: "Choose one useful loop", state: "03" },
  { title: "Rules and owners set", note: "Decide what waits", state: "04" },
  { title: "Prepared work reviewed", note: "See the evidence first", state: "05" },
];

export function GettingStartedHeroVisual() {
  return (
    <div
      className="public-page-hero-visual getting-started-hero-visual"
      role="img"
      aria-label="Early Access journey from request review and workspace invitation through connector setup, policy, and review of prepared work. Trial start remains an explicit workspace choice."
    >
      <div className="onboarding-visual-head"><span>Early Access journey</span><span>YOUR PACE, YOUR RULES</span></div>
      <div className="onboarding-milestone-list">
        {ONBOARDING_MILESTONES.map((milestone, index) => (
          <div className={`onboarding-milestone${index === ONBOARDING_MILESTONES.length - 1 ? " is-last" : ""}`} key={milestone.state}>
            <span className="onboarding-milestone-index">{milestone.state}</span>
            <span className="onboarding-milestone-copy"><strong>{milestone.title}</strong><small>{milestone.note}</small></span>
            {index < ONBOARDING_MILESTONES.length - 1 && <span className="onboarding-milestone-rail" aria-hidden="true" />}
          </div>
        ))}
      </div>
      <div className="onboarding-trial-note"><ShieldCheck size={17} aria-hidden="true" /><span><strong>Trial start is explicit</strong><small>A request never starts an account, trial, or payment.</small></span></div>
    </div>
  );
}

const OPERATING_LOOP_STEPS = ["Connect", "Understand", "Diagnose", "Recommend", "Deploy", "Measure", "Improve"];

export function HowItWorksHeroVisual() {
  return (
    <div
      className="public-page-hero-visual operating-loop-hero-visual"
      role="img"
      aria-label="Auterim operating loop: Connect, Understand, Diagnose, Recommend, Deploy, Measure, Improve."
    >
      <div className="operating-loop-head"><span>One operating loop</span><span>FROM CONTEXT TO IMPROVEMENT</span></div>
      <div className="operating-loop-grid">
        {OPERATING_LOOP_STEPS.map((step, index) => (
          <div className="operating-loop-step" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            {index < OPERATING_LOOP_STEPS.length - 1 && <i aria-hidden="true" />}
          </div>
        ))}
      </div>
      <div className="operating-loop-foot"><span><i aria-hidden="true" /> HUMAN CONTROL STAYS IN THE LOOP</span><span>01 / 07</span></div>
    </div>
  );
}

const CONTROL_OUTCOMES = [
  { label: "Allowed", title: "Continue", note: "Inside policy", kind: "allowed" },
  { label: "Approval", title: "Pause", note: "Wait for a person", kind: "approval" },
  { label: "Blocked", title: "Stop", note: "Outside policy", kind: "blocked" },
];

export function ControlHeroVisual() {
  return (
    <div
      className="public-page-hero-visual control-hero-visual"
      role="img"
      aria-label="A proposed operator action is checked against workspace policy and can continue, wait for a human approval, or stop."
    >
      <div className="control-visual-head"><span>Workspace policy</span><span><ShieldCheck size={15} aria-hidden="true" /> BEFORE EXECUTION</span></div>
      <div className="control-proposed-action"><span className="control-action-icon"><Check size={16} aria-hidden="true" /></span><span><small>PROPOSED ACTION</small><strong>Prepared work is checked first.</strong></span><ArrowDown size={17} aria-hidden="true" /></div>
      <div className="control-outcome-list">
        {CONTROL_OUTCOMES.map((outcome, index) => (
          <div className={`control-outcome is-${outcome.kind}`} key={outcome.kind}>
            <span className="control-outcome-index">0{index + 1}</span>
            <span className="control-outcome-marker" aria-hidden="true" />
            <span className="control-outcome-copy"><small>{outcome.label}</small><strong>{outcome.title}</strong></span>
            <span className="control-outcome-note">{outcome.note}</span>
          </div>
        ))}
      </div>
      <div className="control-visual-foot"><span>Policy belongs to the workspace.</span><span>OWNER DECIDES</span></div>
    </div>
  );
}

const USE_CASE_ROLES = [
  { name: "Revenue Operator", work: "Pipeline and renewals" },
  { name: "Client Flow Operator", work: "Onboarding and delivery" },
  { name: "Operations Operator", work: "Delivery and project health" },
  { name: "Support Operator", work: "Customer support" },
];

export function UseCasesHeroVisual() {
  return (
    <div
      className="public-page-hero-visual use-cases-hero-visual"
      role="img"
      aria-label="Four current Operator roles support revenue, client flow, operations, and support work, each with a defined owner and approval boundary."
    >
      <div className="use-cases-visual-head"><span>Work with a clear owner</span><span>AVAILABLE TODAY</span></div>
      <div className="use-cases-role-list">
        {USE_CASE_ROLES.map((role, index) => {
          const identity = OPERATORS.find((operator) => operator.name === role.name);
          if (!identity) return null;
          return (
            <div className="use-cases-role-row" key={role.name} style={{ "--operator-accent": identity.color } as CSSProperties}>
              <OperatorAvatar color={identity.color} glyph={GLYPHS[identity.glyph]} size={36} />
              <span><small>0{index + 1} / OPERATOR</small><strong>{role.name}</strong></span>
              <span className="use-cases-role-work">{role.work}</span>
              <i className="use-cases-role-boundary" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <div className="use-cases-visual-foot"><ShieldCheck size={15} aria-hidden="true" /><span>Every next step stays inside workspace policy.</span></div>
    </div>
  );
}

const DOCS_GUIDES = ["Getting started", "Operators", "Connectors", "Policies and approvals", "Workflows", "Billing"];

export function DocsHeroVisual() {
  return (
    <div
      className="public-page-hero-visual docs-hero-visual"
      role="img"
      aria-label="Auterim guide map with six topics: Getting started, Operators, Connectors, Policies and approvals, Workflows, and Billing. Guides are expanding during Early Access."
    >
      <div className="docs-visual-head"><span>Auterim field guide</span><span><BookOpen size={14} aria-hidden="true" /> EARLY ACCESS</span></div>
      <div className="docs-guide-index">
        {DOCS_GUIDES.map((guide, index) => (
          <div className={`docs-guide-row${index === 0 ? " is-current" : ""}`} key={guide}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{guide}</strong><ArrowRight size={14} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="docs-visual-foot"><span>Current product guidance</span><span>GUIDES ARE EXPANDING</span></div>
    </div>
  );
}

export function ChangelogHeroVisual({ releases }: { releases: ChangelogRelease[] }) {
  return (
    <div
      className="public-page-hero-visual changelog-hero-visual"
      role="img"
      aria-label={`Recent verified Auterim releases: ${releases.map((release) => `${release.date}, ${release.title}`).join("; ")}.`}
    >
      <div className="changelog-visual-head"><span>Verified product history</span><span>RELEASE NOTES</span></div>
      <div className="changelog-release-list">
        {releases.map((release, index) => (
          <div className="changelog-release-row" key={`${release.date}-${release.title}`}>
            <span className="changelog-release-marker" aria-hidden="true"><i /></span>
            <span className="changelog-release-copy"><small>{release.date}{index === 0 ? " / LATEST" : ""}</small><strong>{release.title}</strong><span>{release.summary}</span></span>
          </div>
        ))}
      </div>
      <div className="changelog-visual-foot"><span>Product changes tied to merged work</span><Clock3 size={14} aria-hidden="true" /></div>
    </div>
  );
}
