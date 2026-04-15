import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | Inovense Admin",
  robots: { index: false, follow: false },
};

type HandbookSection = {
  id: string;
  title: string;
  tag: "Flow" | "Locale" | "AI" | "Commercial" | "Delivery" | "Ops";
  automation: "Manual" | "Mixed" | "Automated";
  summary: string;
  blocks: SectionBlock[];
};

type SectionBlock = {
  title: string;
  tone: "do" | "avoid" | "reference" | "guardrail";
  items: string[];
};

const LEAD_FLOW_STEPS = [
  {
    step: "Lead enters CRM",
    status: "new",
    trigger: "Submitted intake (/intake or /nl/intake) or manual lead creation (/admin/leads/new)",
  },
  { step: "Initial review", status: "reviewing", trigger: "Operator starts qualification work" },
  { step: "Qualified for commercial work", status: "qualified", trigger: "Lane and scope are clear enough for proposal" },
  {
    step: "Proposal intelligence run (optional but recommended)",
    status: "qualified or proposal_sent",
    trigger: "Lead Research -> Proposal Angle -> Proposal Writer draft assist applied before send",
  },
  { step: "Proposal sent", status: "proposal_sent", trigger: "Proposal email sent from CRM" },
  {
    step: "Decision captured",
    status: "payment_requested or lost",
    trigger: "Accept/decline recorded on proposal flow (accepted maps to payment_requested)",
  },
  {
    step: "Contract package",
    status: "payment_requested",
    trigger: "Contract details generated or shared in commercial thread",
  },
  { step: "Payment request sent", status: "payment_requested", trigger: "Payment request email sent from CRM" },
  {
    step: "Deposit confirmed (first strong workspace introduction)",
    status: "deposit_paid",
    trigger: "Mark deposit as paid action in CRM; deposit confirmation email introduces Project Workspace",
  },
  { step: "Onboarding sent", status: "onboarding_sent", trigger: "Onboarding email/link sent" },
  { step: "Onboarding submitted", status: "onboarding_completed", trigger: "Client submits onboarding form" },
  { step: "Delivery in progress", status: "active", trigger: "Operator moves to active once delivery starts" },
  { step: "Final payment confirmed", status: "final_payment_paid_at set", trigger: "Mark final payment action in CRM" },
  { step: "Delivery complete", status: "project_status = completed", trigger: "Operator marks Completed only after handoff is done" },
  { step: "Engagement closed", status: "won or lost", trigger: "Operator closes lifecycle state" },
];

const PROJECT_STATUS_REFERENCE = [
  { value: "Not started", meaning: "Delivery has not started yet." },
  { value: "Ready", meaning: "Preconditions are met and work can start." },
  { value: "Active", meaning: "Delivery is currently in progress." },
  { value: "Paused", meaning: "Delivery is intentionally paused." },
  { value: "Completed", meaning: "Delivery and handoff are actually complete." },
];

const CONTROL_MODEL = [
  {
    title: "Manual By Design",
    body: "Lead status decisions, project status transitions, and final delivery completion stay operator-owned.",
  },
  {
    title: "Automated Events",
    body: "Proposal acceptance, onboarding submit, and first successful payment transitions trigger bounded automations.",
  },
  {
    title: "Strict Separation",
    body: "Payment state tracks money. project_status tracks delivery. Never use one as a proxy for the other.",
  },
];

const OPERATING_STATE_NOW = [
  {
    title: "Proposal intelligence stack is live",
    body: "Lead Research, Proposal Angle, and Proposal Writer are active in lead detail and can apply draft proposal content with operator review.",
  },
  {
    title: "Prospects and outbound discipline are live",
    body: "Prospects have their own statuses, follow-up tracking, snippet support, and controlled conversion into lead lifecycle.",
  },
  {
    title: "Decision-grade performance layer is live",
    body: "Performance now includes Decision Insights, stage deltas vs previous 30d, source quality visibility, and landing page commercial relevance.",
  },
  {
    title: "Client Portal Light is live",
    body: "Project Workspace runs on tokenized routes and reuses lead/proposal/payment/onboarding truth without a separate portal data model.",
  },
  {
    title: "Lifecycle attention layers are live",
    body: "Lead-level reminders, leads-list attention, and overview Weekly Operating Summary are active and designed to reduce proposal/deposit/onboarding leakage.",
  },
  {
    title: "Host split is live",
    body: "Public, Admin, and Portal surfaces route by host with middleware guards and safe redirects.",
  },
];

type SystemLayerRow = {
  layer: string;
  routes: string;
  role: string;
  operatorNotes: string;
};

const CORE_SYSTEM_LAYERS: SystemLayerRow[] = [
  {
    layer: "Public site",
    routes: "/, /build, /systems, /growth, /nl/*",
    role: "Acquisition surface, intake entry, and conversion-ready service pages.",
    operatorNotes: "Do not use for internal workflow execution.",
  },
  {
    layer: "CRM Admin",
    routes: "/admin, /admin/leads, /admin/prospects, /admin/performance, /admin/docs",
    role: "Operational command layer for lifecycle, commercial actions, delivery status, and internal intelligence.",
    operatorNotes: "Primary operator surface.",
  },
  {
    layer: "Proposal flow",
    routes: "/proposal/[token]",
    role: "Client-facing proposal review and decision capture.",
    operatorNotes: "Acceptance maps to payment_requested; decline maps to lost.",
  },
  {
    layer: "Client Portal Light (Project Workspace)",
    routes: "/client/[token] plus linked payment/onboarding/proposal routes",
    role: "Calm client reference point for stage, payment, documents, and next action.",
    operatorNotes: "First strong introduction occurs at deposit confirmation.",
  },
  {
    layer: "Onboarding flow",
    routes: "/onboarding/[token]",
    role: "Collect kickoff input required for clean activation.",
    operatorNotes: "On submit, onboarding_status becomes completed automatically.",
  },
  {
    layer: "Prospects layer",
    routes: "/admin/prospects",
    role: "Pre-lead outbound discipline and follow-up management.",
    operatorNotes: "Prospects are not leads and are excluded from lead funnel semantics.",
  },
  {
    layer: "Performance layer",
    routes: "/admin/performance",
    role: "Strict pipeline signal layer for sessions, leads, and commercial stage progression.",
    operatorNotes: "Semantics are strict; no blended conversion score.",
  },
  {
    layer: "Docs center",
    routes: "/admin/docs",
    role: "Internal source of truth for operators and partner handoff.",
    operatorNotes: "Treat stale docs as a system bug.",
  },
];

type DefinitionRow = {
  term: string;
  meaning: string;
  guardrail: string;
};

const CANONICAL_DEFINITIONS: DefinitionRow[] = [
  {
    term: "Prospect",
    meaning: "Outbound target tracked before lead lifecycle entry.",
    guardrail: "Never count prospects as leads in performance or revenue flow.",
  },
  {
    term: "Lead",
    meaning: "Submitted intake or manual CRM lead record that enters lifecycle statuses.",
    guardrail: "One engagement should map to one lead record unless there is a valid separate deal.",
  },
  {
    term: "Session",
    meaning: "Tracked row in traffic_sessions.",
    guardrail: "Session volume is not lead volume and does not imply qualification.",
  },
  {
    term: "Won",
    meaning: "Lead lifecycle state where commercial commitment is closed as won.",
    guardrail: "Won does not automatically imply deposit paid or completed delivery.",
  },
  {
    term: "Deposit Paid",
    meaning: "Lead with payment state deposit_paid or fully_paid via existing payment fields.",
    guardrail: "Deposit paid does not mean delivery complete.",
  },
  {
    term: "Completed",
    meaning: "project_status = completed after actual delivery and handoff.",
    guardrail: "Completion remains manual and is intentionally separate from payment timestamps.",
  },
  {
    term: "Project Workspace",
    meaning: "Client-facing naming standard for Client Portal Light.",
    guardrail: "Do not introduce as main destination during proposal phase. First strong introduction is deposit confirmation.",
  },
  {
    term: "Manual vs Automatic",
    meaning: "Lifecycle and delivery decisions are mostly operator-owned with bounded automation events.",
    guardrail: "Never let automation blur payment truth, delivery truth, and lifecycle truth.",
  },
];

type BuildOrderStep = {
  step: string;
  status: "Live now" | "Next" | "After next";
  reason: string;
  implementation: string;
};

const CURRENT_BUILD_ORDER: BuildOrderStep[] = [
  {
    step: "Lifecycle reminders",
    status: "Live now",
    reason: "Reduces proposal/deposit/onboarding leakage where handoff discipline usually slips.",
    implementation: "Visible as Needs attention in lead detail and leads list.",
  },
  {
    step: "Weekly Operating Summary",
    status: "Live now",
    reason: "Gives fast start-of-week priority visibility across lifecycle, prospects, and active flow.",
    implementation: "Visible on /admin overview as compact summary cards plus Top 3 actions.",
  },
  {
    step: "Performance Decision Insights",
    status: "Live now",
    reason: "Moves performance from reporting toward decision-grade source/page/stage guidance.",
    implementation: "Visible on /admin/performance with comparison pills and grounded insights.",
  },
  {
    step: "Proof capture and proof loops",
    status: "Next",
    reason: "Operational proof of outcomes will strengthen sales assets and performance learning loops.",
    implementation: "Capture completed outcomes, attach evidence, and feed proof back into proposals/public pages.",
  },
  {
    step: "Host and portal cleanup hardening",
    status: "After next",
    reason: "Keep split-surface routing robust as traffic and partner use increase.",
    implementation: "Tighten host/env audits and portal-route hygiene without expanding product surface.",
  },
];

const MANUAL_AUTOMATION_REFERENCE = [
  {
    area: "Outbound prospects",
    automation: "Manual",
    manual: "Prospects are operator-managed targets with explicit next-step discipline.",
    auto: "No auto-send, no bulk outreach, and no automatic prospect-to-lead conversion.",
  },
  {
    area: "Lead lifecycle status",
    automation: "Mixed",
    manual: "Most status movement is operator-controlled.",
    auto: "Proposal accept and onboarding submit can move lifecycle states.",
  },
  {
    area: "Project status",
    automation: "Manual",
    manual: "Operator sets Not started, Ready, Active, Paused, Completed.",
    auto: "No payment event should set project_status automatically.",
  },
  {
    area: "Payment events",
    automation: "Mixed",
    manual: "Operator confirms cleared deposit/final payment.",
    auto: "First successful mark can trigger payment confirmation email once.",
  },
  {
    area: "Client emails",
    automation: "Mixed",
    manual: "Operator reviews and sends proposal/payment/onboarding emails.",
    auto: "Deposit and final payment confirmations auto-send on first valid transition.",
  },
  {
    area: "Lifecycle reminders",
    automation: "Automated",
    manual: "Operator decides follow-up action and status changes.",
    auto: "System derives proposal/deposit/onboarding attention from lifecycle timestamps.",
  },
  {
    area: "Weekly summary + performance insights",
    automation: "Automated",
    manual: "Operator interprets and executes decisions from surfaced insights.",
    auto: "Overview and Performance aggregate grounded signals and period deltas from live data.",
  },
];

const ACTION_EVENT_MATRIX = [
  {
    action: "Send proposal email",
    trigger: "Operator sends Proposal ready email",
    state: "proposal_sent + proposal_sent_at",
    email: "proposal_sent",
    next: "Wait for client decision. Do not position Project Workspace as the main destination at this stage.",
  },
  {
    action: "Proposal accepted",
    trigger: "Client accepts proposal page",
    state: "proposal_decision accepted + proposal_decided_at + status payment_requested",
    email: "No auto email by default",
    next: "Prepare contract package if needed, then send payment request with correct deposit and payment link.",
  },
  {
    action: "Share contract package",
    trigger: "Operator confirms legal/commercial package for this deal",
    state: "No automatic lifecycle write by default",
    email: "Handled in normal client thread",
    next: "Keep payment_requested stage and proceed to deposit request.",
  },
  {
    action: "Send payment request",
    trigger: "Operator sends Payment request email",
    state: "payment_requested status on send",
    email: "payment_request",
    next: "Wait for cleared funds, then mark deposit paid.",
  },
  {
    action: "Mark deposit as paid",
    trigger: "Operator confirms cleared deposit and clicks action",
    state: "deposit_paid_at set (first transition only)",
    email: "deposit_paid_confirmation auto on first transition",
    next: "This is the first strong Project Workspace introduction. Then proceed with onboarding and kickoff prep.",
  },
  {
    action: "Mark final payment as paid",
    trigger: "Operator confirms remaining balance received",
    state: "final_payment_paid_at set (first transition only)",
    email: "final_payment_received_confirmation auto on first transition",
    next: "Keep project_status unchanged until delivery is complete.",
  },
  {
    action: "Send onboarding",
    trigger: "Operator sends onboarding email/link",
    state: "onboarding_sent + onboarding_status sent",
    email: "onboarding_sent",
    next: "Wait for onboarding submit and review data before activation.",
  },
  {
    action: "Onboarding submitted",
    trigger: "Client submits onboarding form",
    state: "onboarding_completed + onboarding_status completed",
    email: "No auto email",
    next: "Set project_status and lifecycle to active only when work starts.",
  },
  {
    action: "Mark project Completed",
    trigger: "Operator confirms delivery and handoff done",
    state: "project_status completed",
    email: "None by default",
    next: "Close lifecycle state when commercially appropriate.",
  },
];

type LanePricingAnchor = {
  lane: "Build" | "Systems" | "Growth";
  pricingModel: string;
  quoteFirst: string;
  tiers: Array<{
    tier: string;
    range: string;
    scope: string;
    useWhen: string;
    moveUpWhen: string;
  }>;
  retainerPath: string;
};

const LANE_PRICING_ANCHORS: LanePricingAnchor[] = [
  {
    lane: "Build",
    pricingModel: "Productized premium builds with clear scope boundaries.",
    quoteFirst: "Start with Framework for most standard website projects.",
    tiers: [
      {
        tier: "Framework",
        range: "$3.5k-$5.5k",
        scope: "Core site architecture, premium UI direction, production implementation, clean handoff.",
        useWhen: "Use for focused website scopes with limited integration complexity.",
        moveUpWhen:
          "Move to Extended when page count, content depth, or integration needs expand.",
      },
      {
        tier: "Extended",
        range: "$6k-$9k",
        scope: "Broader page system, stronger conversion structure, and deeper implementation scope.",
        useWhen: "Use when delivery needs more architecture depth and cross-page strategy.",
        moveUpWhen:
          "Move to Custom/Premium when dependency, risk, or timeline pressure becomes high.",
      },
      {
        tier: "Custom / Premium",
        range: "$10k-$18k+",
        scope: "High-complexity builds with advanced integrations, custom logic, and elevated execution risk.",
        useWhen: "Use when the project is clearly beyond reusable framework delivery.",
        moveUpWhen:
          "Do not use as default for routine builds.",
      },
    ],
    retainerPath:
      "Offer support/optimization retainer post-launch when monthly updates or CRO iteration is expected.",
  },
  {
    lane: "Systems",
    pricingModel: "Framework-first systems delivery with recurring evolution potential.",
    quoteFirst: "Start with Framework for first production workflow layer.",
    tiers: [
      {
        tier: "Framework",
        range: "$4k-$7k",
        scope: "Workflow mapping, core automation setup, and stable operational baseline.",
        useWhen: "Use for first systems layer and cleaner internal execution rhythm.",
        moveUpWhen:
          "Move to Extended when number of flows, integrations, or teams increases.",
      },
      {
        tier: "Extended",
        range: "$8k-$12k",
        scope: "Multiple flows, deeper automations, and stronger reporting/visibility structure.",
        useWhen: "Use when systems scope spans multiple functions and operational owners.",
        moveUpWhen:
          "Move to Custom/Premium for complex orchestration, integrations, or high criticality.",
      },
      {
        tier: "Custom / Premium",
        range: "$15k-$25k+",
        scope: "Mission-critical systems with bespoke logic and high dependency requirements.",
        useWhen: "Use when framework patterns are insufficient for business-critical delivery.",
        moveUpWhen:
          "Do not position as default for standard systems engagements.",
      },
    ],
    retainerPath:
      "Move to recurring retainer when workflows keep evolving and uptime/iteration becomes business-critical.",
  },
  {
    lane: "Growth",
    pricingModel: "Retainer-first growth model with clear scaling tiers.",
    quoteFirst: "Start with Foundation Retainer for focused monthly execution.",
    tiers: [
      {
        tier: "Foundation Retainer",
        range: "$1.5k-$2.5k/mo",
        scope: "Core growth cadence, baseline reporting, and focused execution priorities.",
        useWhen: "Use for lean growth operations with one core execution track.",
        moveUpWhen:
          "Move to Operator when channels, experiments, or content velocity grow.",
      },
      {
        tier: "Operator Retainer",
        range: "$3k-$4.5k/mo",
        scope: "Broader weekly execution with tighter optimization and pipeline accountability.",
        useWhen: "Use when growth requires continuous testing and cross-channel coordination.",
        moveUpWhen:
          "Move to Scale when execution depth and volume become materially higher.",
      },
      {
        tier: "Scale Retainer",
        range: "$5k-$8k+/mo",
        scope: "High-frequency growth operations with deeper experimentation and performance control.",
        useWhen: "Use when growth is a major operating priority with sustained execution load.",
        moveUpWhen:
          "Do not force for low-complexity or low-volume clients.",
      },
    ],
    retainerPath:
      "Keep one-off growth work limited to audits/setup. Ongoing growth should usually remain retainer-based.",
  },
];

const PRICING_GUARDRAILS = [
  "Start with the lane Framework tier unless clear complexity signals justify a higher tier.",
  "If budget is below floor, reduce scope depth and protect delivery quality.",
  "No random discounting. Any concession must be paired with explicit scope reduction.",
  "Keep proposal price and deposit aligned with selected lane tier before send.",
  "Record quote rationale in notes: lane, tier, complexity signals, and upgrade reason.",
];

const RETAINER_DECISION_RULES = [
  "Use one-off scope when delivery is finite, handoff is clean, and monthly iteration is not required.",
  "Build: move into support/optimization retainer when monthly changes or CRO loops are expected.",
  "Systems: use recurring retainers when workflows evolve continuously or operational dependency is high.",
  "Growth: default to retainer when outcomes require recurring execution and weekly decision loops.",
  "Do not force retainers for low-complexity clients with minimal change frequency.",
];

const PRICING_ANTI_PATTERNS = [
  "Do not improvise pricing from scratch on each lead.",
  "Do not default to Custom/Premium tiers when Framework or Extended can solve the problem.",
  "Do not overscope small budgets just to preserve top-line ticket size.",
  "Do not force retainers when a lean one-off outcome is the better commercial fit.",
];

const QUOTE_FLOW_RULES = [
  "Quote first from lane Framework tier with clear scope boundaries.",
  "Upgrade to Extended only when complexity signals are real and documented.",
  "Use Custom/Premium only when complexity, risk, or dependency truly warrants it.",
  "For Growth, propose retainer tiers as default progression: Foundation -> Operator -> Scale.",
  "When upselling, tie tier changes to execution load and outcome potential, not prestige language.",
];

const SCENARIO_PLAYBOOKS = [
  {
    title: "Proposal accepted, no payment yet",
    meaning: "Commercial intent exists, but no cleared funds.",
    next: "Keep project_status unchanged. Send or follow up payment request.",
  },
  {
    title: "Deposit paid, project not started",
    meaning: "Client commitment is secured; delivery may still be pending.",
    next: "Run onboarding and kickoff prep. Move to Active only when work begins.",
  },
  {
    title: "Final payment received, project not completed",
    meaning: "Payment side is settled; delivery truth is separate.",
    next: "Do not set Completed yet. Update project_status only after handoff.",
  },
  {
    title: "Dutch lead vs global lead",
    meaning: "Locale, templates, and client currency follow lead context.",
    next: "Validate lead_source and local_currency_code before sending client comms.",
  },
  {
    title: "FX missing for internal USD comparison",
    meaning: "Local amounts are still valid; USD comparison cannot be locked yet.",
    next: "Show local truth and add/update usd_fx_rate_locked when available.",
  },
  {
    title: "Proposal Writer output vs client proposal",
    meaning: "Agent output is draft input, not auto-approved client text.",
    next: "Review, apply intentionally, and verify commercial values before send.",
  },
];

const SECTIONS: HandbookSection[] = [
  {
    id: "lead-operating-flow",
    title: "Lead Operating Flow",
    tag: "Flow",
    automation: "Mixed",
    summary:
      "Use lead status to represent commercial lifecycle truth. Do not skip stages just to move faster.",
    blocks: [
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Keep lead status aligned with reality at every handoff point.",
          "Capture proposal decisions before moving forward with payment or closeout.",
          "Use notes for material decisions, exceptions, and client confirmations.",
          "Use one lead record per company engagement unless there is a valid separate deal.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not treat status as a cosmetic badge. It is pipeline state.",
          "Do not move to deposit_paid before cleared funds are confirmed.",
          "Do not move to active before onboarding is complete and delivery is actually starting.",
          "Do not use project_status as a replacement for lead status.",
        ],
      },
      {
        title: "Automation boundaries",
        tone: "reference",
        items: [
          "Proposal acceptance can move lead status to payment_requested.",
          "Onboarding submission moves lead status to onboarding_completed automatically.",
          "Lead status does not auto-progress to active or won. Those remain operator decisions.",
        ],
      },
    ],
  },
  {
    id: "locale-and-language",
    title: "Locale And Language Handling",
    tag: "Locale",
    automation: "Automated",
    summary:
      "Lead source drives locale behavior across CRM email templates, client pages, and agent output language.",
    blocks: [
      {
        title: "How locale resolves",
        tone: "reference",
        items: [
          "Dutch locale resolves for lead_source values like nl_web, nl_*, nl, or values containing dutch/nederland.",
          "All other lead sources default to English locale behavior.",
          "Client currency defaults follow market inference: NL => EUR, UK => GBP, otherwise USD unless explicitly set.",
          "Manual leads must have lead_source set correctly to avoid wrong-language output.",
        ],
      },
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Set lead_source correctly at lead creation for referrals and manual entries.",
          "If language preference differs from source, log that decision in notes and keep communication consistent.",
          "Verify locale-sensitive emails in preview before sending high-stakes comms.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not force Dutch or English based on personal preference. Follow lead context.",
          "Do not create a separate process tree for Dutch leads.",
        ],
      },
    ],
  },
  {
    id: "outbound-prospects",
    title: "Outbound Prospects Layer",
    tag: "Ops",
    automation: "Manual",
    summary:
      "Prospects are pre-lead outbound targets. Keep outreach disciplined, convert intentionally, and keep lead semantics clean.",
    blocks: [
      {
        title: "Prospect vs lead",
        tone: "guardrail",
        items: [
          "Prospect = researched target not yet in active commercial flow.",
          "Lead = submitted inquiry or manually qualified lead record in CRM lifecycle.",
          "Do not count prospects as leads in performance reporting.",
        ],
      },
      {
        title: "Prospect statuses",
        tone: "reference",
        items: [
          "new -> researched -> ready_to_contact -> contacted -> replied -> qualified -> converted_to_lead.",
          "not_fit is explicit closeout for prospects that should not enter lead flow.",
          "Use next_follow_up_at discipline on active statuses to prevent outbound leakage.",
        ],
      },
      {
        title: "Operator workflow",
        tone: "do",
        items: [
          "Track company, channel, lane fit, status, opening angle, and next_follow_up_at for every outbound target.",
          "Use NL/EN snippet library for first-touch and follow-up support, then personalize before send.",
          "Maintain next-step discipline: if status changes, update follow-up date or close as not fit.",
        ],
      },
      {
        title: "Convert to lead rule",
        tone: "reference",
        items: [
          "Convert only when conversation is commercially real and qualified for proposal/payment flow.",
          "Conversion should carry core fields into leads while preserving locale/currency defaults.",
          "After conversion, continue execution in the normal lead detail flow.",
        ],
      },
      {
        title: "What this layer is not",
        tone: "avoid",
        items: [
          "Not a bulk sender, campaign builder, or inbox automation suite.",
          "Do not auto-send outreach from CRM templates without human review.",
          "Do not blur prospect statuses with lead lifecycle statuses.",
        ],
      },
    ],
  },
  {
    id: "agent-stack",
    title: "AI Agent Stack In CRM",
    tag: "AI",
    automation: "Mixed",
    summary:
      "Agents accelerate proposal quality, but they do not send client emails and they do not change lifecycle status.",
    blocks: [
      {
        title: "Lead Research Agent",
        tone: "reference",
        items: [
          "Runs from lead context and website data.",
          "Writes research_audit and research_audit_at on the lead record.",
          "Does not change lead status or send emails.",
        ],
      },
      {
        title: "Proposal Angle Agent",
        tone: "reference",
        items: [
          "Requires Lead Research output first.",
          "Writes proposal_angle and proposal_angle_at.",
          "Apply action can write proposal prefill fields and proposal_angle_applied_at.",
          "Does not send emails or change status.",
        ],
      },
      {
        title: "Proposal Writer Agent",
        tone: "reference",
        items: [
          "Requires both Lead Research and Proposal Angle output.",
          "Writes proposal_writer and proposal_writer_at.",
          "Apply action writes proposal content fields and proposal_writer_applied_at.",
          "Includes server-side safety checks to block internal strategy leakage in client-facing fields.",
        ],
      },
      {
        title: "Proposal email draft flow",
        tone: "do",
        items: [
          "Proposal Writer produces proposal_email_prefill (subject + body).",
          "In Send email > Proposal ready, use the Use Proposal Writer draft action.",
          "Review before send. Draft assist does not equal auto-send.",
        ],
      },
    ],
  },
  {
    id: "proposal-and-commercial",
    title: "Proposal And Commercial Workflow",
    tag: "Commercial",
    automation: "Mixed",
    summary:
      "Proposal content, price, deposit, and send timing must stay synchronized. Drift here causes downstream errors.",
    blocks: [
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Set proposal price and proposal deposit before sending proposal/payment communications.",
          "Use proposal apply actions carefully because they overwrite client-facing proposal content fields.",
          "Send proposal from CRM so logs and status updates remain accurate.",
          "After acceptance, confirm the payment step promptly.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not let proposal body and commercial amounts diverge.",
          "Do not treat AI outputs as auto-approved without review.",
          "Do not skip proposal decision capture before payment follow-through.",
        ],
      },
      {
        title: "Reference",
        tone: "reference",
        items: [
          "Payment request emails use proposal_deposit unless deposit_amount override is set.",
          "Proposal acceptance can route lead status to payment_requested in the proposal action flow.",
        ],
      },
    ],
  },
  {
    id: "payment-and-confirmation",
    title: "Payment Events And Confirmation Emails",
    tag: "Commercial",
    automation: "Mixed",
    summary:
      "Deposit received and final payment received are separate business events with separate email semantics.",
    blocks: [
      {
        title: "Current behavior",
        tone: "reference",
        items: [
          "Mark deposit as paid sets deposit_paid_at, snapshots deposit amount when needed, and sets lead status to deposit_paid.",
          "Deposit confirmation email introduces Project Workspace as the central place for status, links, and next steps.",
          "Mark final payment as paid sets final_payment_paid_at only; it does not auto-change project_status.",
          "Saved payment_link is immediately reused by Project Workspace payment CTA when deposit is still pending.",
          "Server-side idempotency only allows first-time transitions when paid-at fields are null.",
          "On first successful transition, CRM sends a branded event-specific confirmation email automatically.",
          "Email language follows lead locale logic from lead_source.",
          "Email logs use separate event types: deposit_paid_confirmation and final_payment_received_confirmation.",
        ],
      },
      {
        title: "Duplicate-send protection",
        tone: "guardrail",
        items: [
          "Repeated clicks after paid state do not resend event emails.",
          "Email helpers check existing lead_email_log event type before sending.",
          "If email send fails after payment state changes, payment remains correct and warning is surfaced.",
        ],
      },
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Use Mark deposit as paid only after payment is confirmed as cleared.",
          "Treat email warnings as follow-up tasks, not as reasons to revert payment state.",
          "Keep payment_link, invoice_reference, and deposit override maintained in Payment section.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not mark paid speculatively.",
          "Do not manually spam confirmation emails for duplicate clicks.",
          "Do not link payment state to project completion state.",
          "Do not use deposit wording for final payment communication.",
        ],
      },
    ],
  },
  {
    id: "currency-and-market-handling",
    title: "Currency And Market Handling",
    tag: "Locale",
    automation: "Mixed",
    summary:
      "Internal CRM compares in USD where available, while client-facing proposal and payment communication stays local/original currency.",
    blocks: [
      {
        title: "Operational model",
        tone: "reference",
        items: [
          "Lead stores local_currency_code as source-of-truth for client-facing amount rendering.",
          "Internal admin can show USD-primary plus local-secondary when usd_fx_rate_locked is available.",
          "If local currency is USD, no FX conversion is required to show USD values.",
          "Country and currency defaults can be inferred from lead_source, then manually corrected when needed.",
        ],
      },
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Confirm local_currency_code before sending proposal/payment emails.",
          "Lock usd_fx_rate_locked when a non-USD lead needs reliable internal USD comparison.",
          "Use country_code only when grounded by explicit data or deterministic source mapping.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not force client-facing proposals or payment emails into USD for local leads.",
          "Do not guess country from weak signals.",
          "Do not rewrite historical local amounts during currency updates.",
        ],
      },
    ],
  },
  {
    id: "revenue-visibility",
    title: "Revenue Visibility",
    tag: "Commercial",
    automation: "Automated",
    summary:
      "Revenue views derive from stored payment fields and project status. Metrics are only trustworthy when data discipline is maintained.",
    blocks: [
      {
        title: "Reference",
        tone: "reference",
        items: [
          "Revenue card state is derived from proposal_price, proposal_deposit, deposit_amount, deposit_paid_at, and final_payment_paid_at.",
          "Overview and Leads pages aggregate cash collected, outstanding, and completed revenue in USD-primary internal view.",
          "Lead detail can show USD primary with local secondary, or local fallback when FX is unavailable.",
          "Completed revenue depends on fully paid plus project_status = completed.",
        ],
      },
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Keep proposal price and payment fields accurate so dashboards remain usable.",
          "Use final payment mark when remaining balance is actually received.",
          "Use project_status completed only when delivery is truly complete.",
        ],
      },
    ],
  },
  {
    id: "project-status-semantics",
    title: "Project Status Semantics",
    tag: "Delivery",
    automation: "Manual",
    summary:
      "Project status is a delivery tracker, separate from commercial and payment lifecycle state.",
    blocks: [
      {
        title: "Hard rule",
        tone: "guardrail",
        items: [
          "Project status remains manual.",
          "Completed means delivered and complete, not merely paid.",
          "No payment event should auto-set project_status.",
        ],
      },
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Use Ready when prerequisites are satisfied and delivery can start.",
          "Use Active only when work is actively underway.",
          "Use Paused explicitly when delivery stops intentionally.",
          "Set Completed only after deliverables and handoff are done.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not infer Completed from deposit_paid_at or final_payment_paid_at.",
          "Do not rely on lead status alone to represent delivery state.",
        ],
      },
    ],
  },
  {
    id: "onboarding-and-activation",
    title: "Onboarding And Activation",
    tag: "Delivery",
    automation: "Mixed",
    summary:
      "Onboarding has a clear transition boundary: send link, receive brief, review, then activate delivery manually.",
    blocks: [
      {
        title: "Current behavior",
        tone: "reference",
        items: [
          "Onboarding link send sets onboarding_status sent and lead status onboarding_sent.",
          "Client submit sets onboarding_status completed and lead status onboarding_completed automatically.",
          "Activation readiness indicator combines deposit paid and onboarding completed signals.",
        ],
      },
      {
        title: "Operator actions",
        tone: "do",
        items: [
          "Review onboarding data before moving into delivery.",
          "Move lead lifecycle status to active when delivery actually starts.",
          "Set project_status to match real delivery state.",
        ],
      },
      {
        title: "Do not do this",
        tone: "avoid",
        items: [
          "Do not start deliverables on incomplete onboarding context.",
          "Do not treat onboarding completion as automatic project completion.",
        ],
      },
    ],
  },
  {
    id: "client-portal-light",
    title: "Client Portal Light",
    tag: "Delivery",
    automation: "Mixed",
    summary:
      "Client Portal Light is a private project workspace for calm visibility. It centralizes status and key links without exposing internal CRM complexity.",
    blocks: [
      {
        title: "What it includes",
        tone: "do",
        items: [
          "One private tokenized route per project context at /client/[token].",
          "Client-facing status, current step, next action, payment state, and concise project summary.",
          "Direct links to proposal, payment, and onboarding when available.",
          "State-aware payment panel: pending, payment CTA when link exists, deposit received state, fully paid state.",
          "Simple contact route back to hello@inovense.com.",
          "First strong client-facing introduction at deposit confirmation, then reinforced during onboarding/delivery.",
        ],
      },
      {
        title: "What it does not include",
        tone: "avoid",
        items: [
          "No chat inbox, task board, or internal timeline dump.",
          "No internal CRM notes, internal_next_step text, or operator terminology.",
          "No separate data model. Portal reads from existing lead/proposal/payment/onboarding fields.",
        ],
      },
      {
        title: "Operator sharing flow",
        tone: "reference",
        items: [
          "Use Lead detail > Client portal to generate or copy the private link.",
          "Client-facing naming standard is Project Workspace.",
          "The portal token reuses proposal_token for minimal system complexity and consistent access.",
          "Refresh token rotates both proposal and portal access links for that lead.",
          "Keep lead_source accurate so portal locale resolves correctly (EN default, NL when lead context is Dutch).",
          "Proposal emails stay proposal-first; do not introduce Project Workspace as the main layer before deposit is confirmed.",
        ],
      },
    ],
  },
  {
    id: "structured-client-content-rendering",
    title: "Structured Client Content Rendering",
    tag: "Delivery",
    automation: "Automated",
    summary:
      "Proposal and Project Workspace summary fields support lightweight structured text rendering without a rich-text editor.",
    blocks: [
      {
        title: "Supported syntax",
        tone: "reference",
        items: [
          "Paragraph spacing is preserved by blank lines.",
          "Line breaks are preserved cleanly in paragraph text.",
          "Lines starting with '- ' are rendered as bullet items.",
          "Lines starting with '• ' are rendered as bullet items.",
        ],
      },
      {
        title: "Where it applies",
        tone: "reference",
        items: [
          "Proposal page: intro, scope, deliverables, timeline fields render with lightweight structure.",
          "Project Workspace summary: proposal intro/scope/deliverables/timeline use the same rendering component.",
          "Fallback summary also uses the same parser to avoid dense text walls.",
        ],
      },
      {
        title: "Guardrails",
        tone: "guardrail",
        items: [
          "No markdown dependency and no WYSIWYG editor are required.",
          "CRM authoring stays plain text and remains backward-compatible.",
          "Do not treat this as full document authoring; keep syntax lightweight.",
        ],
      },
    ],
  },
  {
    id: "lifecycle-attention-layer",
    title: "Lifecycle Attention Layer",
    tag: "Ops",
    automation: "Automated",
    summary:
      "Internal reminder logic highlights proposal, deposit, and onboarding leakage without adding alert noise.",
    blocks: [
      {
        title: "Reminder classes",
        tone: "reference",
        items: [
          "Proposal follow-up due: proposal sent with no meaningful progression after threshold window.",
          "Deposit pending due: accepted/payment_requested lead without cleared deposit after threshold window.",
          "Onboarding pending due: deposit paid but onboarding not completed after threshold window.",
        ],
      },
      {
        title: "Where operators see this",
        tone: "do",
        items: [
          "Lead detail includes Needs attention cards with age labels and next-action text.",
          "Leads index includes an attention summary plus per-lead attention visibility.",
          "These reminders are internal-only and intentionally not pushed to clients.",
        ],
      },
      {
        title: "Signal quality rules",
        tone: "guardrail",
        items: [
          "Do not blur reminder meaning across stages.",
          "Do not add broad notifications or toast spam.",
          "Reminder logic reuses lifecycle truth fields and does not create parallel business state.",
        ],
      },
    ],
  },
  {
    id: "weekly-operating-summary",
    title: "Weekly Operating Summary",
    tag: "Ops",
    automation: "Automated",
    summary:
      "Overview-level weekly briefing prioritizes what needs action now across leads, payment progression, onboarding, prospects, and active flow.",
    blocks: [
      {
        title: "Current blocks",
        tone: "reference",
        items: [
          "Proposal follow-up",
          "Deposit pending",
          "Onboarding pending",
          "Prospect attention",
          "Active attention",
          "Top 3 to act on now",
        ],
      },
      {
        title: "Operator usage",
        tone: "do",
        items: [
          "Start weekly planning from /admin and clear top priority items first.",
          "Use direct links from summary cards to execute in lead/prospect detail.",
          "Treat this as briefing, not as a standalone reporting dashboard.",
        ],
      },
      {
        title: "Design intent",
        tone: "guardrail",
        items: [
          "Compact and scan-first (under 30 seconds).",
          "No giant tables or vanity KPI expansion.",
          "Only high-signal categories grounded in existing operational truth.",
        ],
      },
    ],
  },
  {
    id: "performance-decision-layer",
    title: "Performance Decision Layer",
    tag: "Ops",
    automation: "Automated",
    summary:
      "Performance is now a compact decision layer: strongest/weakest signals, stage deltas, and source/page quality context.",
    blocks: [
      {
        title: "What is now surfaced",
        tone: "reference",
        items: [
          "Decision Insights cards for strongest source, weakest stage, best landing pages, biggest drop-off, and current focus.",
          "Previous-period deltas for sessions, leads, Session -> Lead, Lead -> Won, Won -> Deposit, and Deposit -> Completed.",
          "Source quality snapshot distinguishing efficient progression vs high-traffic weak-quality signals.",
          "Landing page relevance by both lead generation and downstream commercial progression.",
        ],
      },
      {
        title: "Operator usage",
        tone: "do",
        items: [
          "Use deltas to decide whether to prioritize capture quality or downstream follow-through.",
          "Use source quality snapshot before reallocating traffic attention.",
          "Use landing watch rows to flag pages with traffic but weak lead yield.",
        ],
      },
      {
        title: "Guardrails",
        tone: "guardrail",
        items: [
          "Do not overstate confidence on thin samples.",
          "Do not collapse stages into one blended score.",
          "Keep interpretations grounded in explicit numerator/denominator rows.",
        ],
      },
    ],
  },
  {
    id: "host-surface-routing",
    title: "Host Surface Routing",
    tag: "Ops",
    automation: "Automated",
    summary:
      "Middleware enforces public/admin/portal separation while preserving token-based client routes and admin auth boundaries.",
    blocks: [
      {
        title: "Live surfaces",
        tone: "reference",
        items: [
          "Public host serves marketing site and redirects client/admin paths to their dedicated hosts.",
          "Admin host rewrites non-API app paths into /admin and enforces authenticated access.",
          "Portal host maps token paths into /client/[token] and allows proposal/onboarding/client surfaces only.",
        ],
      },
      {
        title: "Operator implications",
        tone: "do",
        items: [
          "Treat host-split behavior as part of normal deployment contract.",
          "Keep NEXT_PUBLIC_PUBLIC_HOST, NEXT_PUBLIC_ADMIN_HOST, and NEXT_PUBLIC_PORTAL_HOST consistent with environment.",
          "Use portal token links as client-facing endpoints; do not share admin routes externally.",
        ],
      },
      {
        title: "Guardrails",
        tone: "guardrail",
        items: [
          "Unknown preview hosts fall back to development surface behavior.",
          "Client-surface routes are intentionally blocked from admin host navigation flow.",
          "Portal surface does not expose admin pages.",
        ],
      },
    ],
  },
  {
    id: "traffic-and-performance-definitions",
    title: "Traffic And Performance Definitions",
    tag: "Ops",
    automation: "Automated",
    summary:
      "Performance reporting is strict by design: sessions come from traffic_sessions, and leads come only from real CRM lead records.",
    blocks: [
      {
        title: "Canonical entities",
        tone: "reference",
        items: [
          "Session = tracked public traffic session row in traffic_sessions.",
          "Lead = submitted inquiry (EN/NL intake submit) or manual CRM lead record from /admin/leads/new.",
          "Won = lead.status = won.",
          "Deposit Paid = lead with payment state deposit_paid or fully_paid.",
          "Completed = lead with project_status = completed (delivered), independent from payment timestamps.",
        ],
      },
      {
        title: "Metric semantics in Performance",
        tone: "reference",
        items: [
          "Session -> Lead uses leads.created_at in the same window divided by traffic_sessions.first_seen_at in the same window.",
          "Lead -> Won uses won leads divided by lead cohort count for that window.",
          "Won -> Deposit Paid uses won leads with cleared deposit/full payment divided by won leads.",
          "Deposit Paid -> Completed uses deposit-paid lead cohort divided by project_status = completed.",
          "Decision Insights layer adds grounded source/page/stage interpretation without changing these stage definitions.",
          "Comparison pills and stage trends use current 30d versus previous 30d windows.",
        ],
      },
      {
        title: "Source and landing quality logic",
        tone: "reference",
        items: [
          "Source quality distinguishes traffic volume from commercial progression (won/deposit/completed context).",
          "Landing relevance includes both lead-generation and downstream outcome visibility.",
          "Performance watch rows highlight high-traffic pages/sources with weak progression signals.",
        ],
      },
      {
        title: "Guardrails",
        tone: "avoid",
        items: [
          "Do not count anonymous traffic, page hits, tracker pings, or partial form interactions as leads.",
          "Do not blend Session -> Lead with later commercial or delivery stages into one fake conversion metric.",
          "Do not treat paid as completed.",
        ],
      },
      {
        title: "Navigation and visibility",
        tone: "reference",
        items: [
          "Performance is visible in top nav as /admin/performance.",
          "Planner route and code remain active at /admin/planner but are intentionally hidden from visible top navigation.",
        ],
      },
    ],
  },
  {
    id: "deliberate-non-features",
    title: "Deliberate Non-Features",
    tag: "Ops",
    automation: "Manual",
    summary:
      "Several product ideas are intentionally excluded to keep the system premium, compact, and high-signal.",
    blocks: [
      {
        title: "Intentionally not built",
        tone: "reference",
        items: [
          "No full BI dashboard stack.",
          "No noisy notifications inbox.",
          "No rich-text/WYSIWYG editor for proposal and workspace content.",
          "No full client portal product with chat/task-board complexity.",
          "No auto-send outbound engine for prospects.",
        ],
      },
      {
        title: "Reason",
        tone: "guardrail",
        items: [
          "Protect operator attention from low-signal noise.",
          "Keep workflows understandable by small teams and partners.",
          "Prefer strict state truth over broad feature surface.",
        ],
      },
      {
        title: "Operator expectation",
        tone: "do",
        items: [
          "Use compact attention layers and direct execution paths.",
          "Escalate only where commercial/delivery risk is real.",
          "Treat simplicity as an operating constraint, not a temporary limitation.",
        ],
      },
    ],
  },
  {
    id: "operator-qa",
    title: "Operator QA And Edge Cases",
    tag: "Ops",
    automation: "Manual",
    summary:
      "Use this as the final pass before you move a record to the next critical stage.",
    blocks: [
      {
        title: "Stage gate checks",
        tone: "do",
        items: [
          "Before proposal send: lane, price, and deposit are set and current.",
          "Before deposit mark: payment has cleared and payment metadata is complete.",
          "Before active: onboarding is complete and delivery start is real.",
          "Before completed: delivery and handoff are done, not just invoiced.",
        ],
      },
      {
        title: "Common failures to prevent",
        tone: "avoid",
        items: [
          "Locale mismatch caused by missing or wrong lead_source.",
          "Proposal content overwrite without checking existing edits.",
          "Confusing lead status with project_status when reporting outcomes.",
          "Skipping logs and notes for key commercial decisions.",
        ],
      },
      {
        title: "Escalation hints",
        tone: "reference",
        items: [
          "If email delivery fails, verify Resend key and inspect lead_email_log.",
          "If status looks stale, refresh and confirm write success in lead record.",
          "If payment state is wrong, correct payment fields first before downstream status edits.",
        ],
      },
    ],
  },
];

const TONE_STYLES: Record<SectionBlock["tone"], { label: string; cls: string }> = {
  do: {
    label: "Do",
    cls: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
  },
  avoid: {
    label: "Avoid",
    cls: "border-red-500/20 bg-red-500/5 text-red-300",
  },
  reference: {
    label: "Reference",
    cls: "border-zinc-700/60 bg-zinc-900/30 text-zinc-300",
  },
  guardrail: {
    label: "Guardrail",
    cls: "border-brand/30 bg-brand/10 text-brand",
  },
};

const TAG_STYLES: Record<HandbookSection["tag"], string> = {
  Flow: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Locale: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  AI: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  Commercial: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Delivery: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Ops: "border-zinc-700/60 bg-zinc-800/40 text-zinc-300",
};

const AUTOMATION_STYLES: Record<HandbookSection["automation"], string> = {
  Manual: "border-zinc-700/70 text-zinc-400",
  Mixed: "border-brand/40 text-brand",
  Automated: "border-emerald-500/40 text-emerald-400",
};

const CORE_NAV_ITEMS = [
  { id: "operating-state-now", title: "Operating State Now" },
  { id: "core-system-layers", title: "Core System Layers" },
  { id: "canonical-definitions", title: "Canonical Definitions" },
  { id: "control-model", title: "Control Model" },
  { id: "manual-vs-automatic", title: "Manual vs Automatic" },
  { id: "action-event-map", title: "Action Event Map" },
  { id: "pricing-framework", title: "Pricing Framework" },
  { id: "flow-reference", title: "Lifecycle Reference" },
  { id: "current-build-order", title: "Current Build Order" },
  { id: "outbound-prospects", title: "Outbound Prospects" },
  { id: "scenario-playbooks", title: "Scenario Playbooks" },
  { id: "project-status-reference", title: "Project Status Reference" },
];

type NavItem = { id: string; title: string };
type NavGroup = { label: string; items: NavItem[] };

function getNavItems(): NavItem[] {
  const sectionItems = SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
  }));
  const combined = [...CORE_NAV_ITEMS, ...sectionItems];
  const seen = new Set<string>();
  return combined.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getNavGroups(): NavGroup[] {
  const flowIds = new Set([
    "lead-operating-flow", "flow-reference", "outbound-prospects",
    "project-status-reference", "onboarding-and-activation",
  ]);
  const commercialIds = new Set([
    "pricing-framework", "action-event-map", "proposal-and-commercial",
    "payment-and-confirmation", "currency-and-market-handling",
    "revenue-visibility", "scenario-playbooks",
  ]);
  const deliveryIds = new Set([
    "project-status-semantics", "client-portal-light",
    "structured-client-content-rendering", "lifecycle-attention-layer",
  ]);
  const aiIds = new Set(["agent-stack"]);

  const all = getNavItems();
  const groups: NavGroup[] = [
    { label: "Flow", items: all.filter((i) => flowIds.has(i.id)) },
    { label: "Commercial", items: all.filter((i) => commercialIds.has(i.id)) },
    { label: "Delivery", items: all.filter((i) => deliveryIds.has(i.id)) },
    { label: "AI", items: all.filter((i) => aiIds.has(i.id)) },
    {
      label: "Ops",
      items: all.filter(
        (i) =>
          !flowIds.has(i.id) &&
          !commercialIds.has(i.id) &&
          !deliveryIds.has(i.id) &&
          !aiIds.has(i.id)
      ),
    },
  ];
  return groups.filter((g) => g.items.length > 0);
}

function SectionTag({ label }: { label: HandbookSection["tag"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${TAG_STYLES[label]}`}
    >
      {label}
    </span>
  );
}

function AutomationTag({ label }: { label: HandbookSection["automation"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${AUTOMATION_STYLES[label]}`}
    >
      {label}
    </span>
  );
}

function BlockCard({ block }: { block: SectionBlock }) {
  const tone = TONE_STYLES[block.tone];
  return (
    <div className={`rounded-xl border p-3 ${tone.cls}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] opacity-80">
          {tone.label}
        </p>
        <span className="text-[10px] uppercase tracking-[0.12em] opacity-70">
          {block.title}
        </span>
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed">
        {block.items.map((item, index) => (
          <li key={`${block.title}-${index}`} className="flex items-start gap-2.5">
            <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HandbookSectionCard({ section }: { section: HandbookSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <details>
          <summary className="cursor-pointer list-none border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <SectionTag label={section.tag} />
              <AutomationTag label={section.automation} />
              <h2 className="text-sm font-semibold text-zinc-100">{section.title}</h2>
              <span className="ml-auto text-[10px] text-zinc-700">expand</span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">
              {section.summary}
            </p>
          </summary>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {section.blocks.map((block) => (
              <BlockCard key={`${section.id}-${block.title}`} block={block} />
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

function ActionEventMap() {
  return (
    <section id="action-event-map" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Ops" />
            <AutomationTag label="Mixed" />
            <h2 className="text-sm font-semibold text-zinc-100">Action Event Map</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Use this map to verify what each critical action writes, which email event fires, and what
            the next operator decision should be.
          </p>
        </div>
        <div className="space-y-2 p-4">
          {ACTION_EVENT_MATRIX.map((row) => (
            <article
              key={row.action}
              className="grid gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5 md:grid-cols-[1.4fr_1.2fr_1.4fr_1.4fr]"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Action</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">{row.action}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{row.trigger}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">State Change</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">{row.state}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Email Event</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">{row.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Correct Next Action</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{row.next}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingFramework() {
  return (
    <section id="pricing-framework" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Commercial" />
            <AutomationTag label="Manual" />
            <h2 className="text-sm font-semibold text-zinc-100">Pricing Framework</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            English-first internal USD anchors with framework tiers and clean upgrade logic. Convert to local client currency for client-facing proposal/payment communication where needed.
          </p>
        </div>

        <div className="space-y-3 p-4">
          {LANE_PRICING_ANCHORS.map((lane) => (
            <article
              key={lane.lane}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5"
            >
              <div className="grid gap-2 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Lane
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {lane.lane}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {lane.pricingModel}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Quote First
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                    {lane.quoteFirst}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {lane.tiers.map((tier) => (
                  <div
                    key={`${lane.lane}-${tier.tier}`}
                    className="rounded-lg border border-zinc-800/70 bg-zinc-900/35 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                      {tier.tier}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {tier.range}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {tier.scope}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      <span className="text-zinc-400">Use when: </span>
                      {tier.useWhen}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      <span className="text-zinc-400">Move up when: </span>
                      {tier.moveUpWhen}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                <span className="text-zinc-300">Retainer path: </span>
                {lane.retainerPath}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-3 border-t border-zinc-800/70 p-4 md:grid-cols-2 xl:grid-cols-4">
          <BlockCard
            block={{
              title: "Quote flow",
              tone: "do",
              items: QUOTE_FLOW_RULES,
            }}
          />
          <BlockCard
            block={{
              title: "Anti-chaos quoting rules",
              tone: "guardrail",
              items: PRICING_GUARDRAILS,
            }}
          />
          <BlockCard
            block={{
              title: "Retainer logic",
              tone: "do",
              items: RETAINER_DECISION_RULES,
            }}
          />
          <BlockCard
            block={{
              title: "What not to do",
              tone: "avoid",
              items: PRICING_ANTI_PATTERNS,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ScenarioPlaybooks() {
  return (
    <section id="scenario-playbooks" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Ops" />
            <AutomationTag label="Manual" />
            <h2 className="text-sm font-semibold text-zinc-100">Scenario Playbooks</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Fast guidance for frequent edge cases so operators can move without guessing.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {SCENARIO_PLAYBOOKS.map((scenario) => (
            <article
              key={scenario.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5"
            >
              <p className="text-sm font-medium text-zinc-200">{scenario.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{scenario.meaning}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{scenario.next}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperatingStateNowSection() {
  return (
    <section id="operating-state-now" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Ops" />
            <AutomationTag label="Mixed" />
            <h2 className="text-sm font-semibold text-zinc-100">Operating State Now</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Current live state beyond the earlier launch baseline. Treat this as real system truth.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {OPERATING_STATE_NOW.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5"
            >
              <p className="text-sm font-medium text-zinc-200">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoreSystemLayersSection() {
  return (
    <section id="core-system-layers" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Ops" />
            <AutomationTag label="Mixed" />
            <h2 className="text-sm font-semibold text-zinc-100">Core System Layers</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Layer map for operators across public, admin, proposal, portal, prospects, performance, and docs.
          </p>
        </div>
        <div className="space-y-2 p-4">
          {CORE_SYSTEM_LAYERS.map((row) => (
            <article
              key={row.layer}
              className="grid gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5 md:grid-cols-[1fr_1fr_1.2fr_1.2fr]"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Layer</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">{row.layer}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Routes</p>
                <p className="mt-1 font-mono text-xs leading-relaxed text-zinc-400">{row.routes}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Role</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">{row.role}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Operator note</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{row.operatorNotes}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CanonicalDefinitionsSection() {
  return (
    <section id="canonical-definitions" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Ops" />
            <AutomationTag label="Manual" />
            <h2 className="text-sm font-semibold text-zinc-100">Canonical Definitions</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Non-negotiable terminology for lifecycle, performance, prospects, and client-facing naming.
          </p>
        </div>
        <div className="space-y-2 p-4">
          {CANONICAL_DEFINITIONS.map((row) => (
            <article
              key={row.term}
              className="grid gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5 md:grid-cols-[0.8fr_1.4fr_1.4fr]"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Term</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">{row.term}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Meaning</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">{row.meaning}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Guardrail</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{row.guardrail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurrentBuildOrderSection() {
  const statusClass: Record<BuildOrderStep["status"], string> = {
    "Live now": "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
    Next: "border-brand/35 bg-brand/10 text-brand",
    "After next": "border-zinc-700/70 bg-zinc-900/35 text-zinc-400",
  };

  return (
    <section id="current-build-order" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag label="Ops" />
            <AutomationTag label="Manual" />
            <h2 className="text-sm font-semibold text-zinc-100">Current Build Order</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Ordered by current operational value, not vanity roadmap volume.
          </p>
        </div>
        <div className="space-y-2 p-4">
          {CURRENT_BUILD_ORDER.map((row, index) => (
            <article
              key={row.step}
              className="grid gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5 md:grid-cols-[28px_1.2fr_1.2fr_1.2fr]"
            >
              <span className="text-sm font-semibold tabular-nums text-zinc-500">{index + 1}</span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Step</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">{row.step}</p>
                <span
                  className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${statusClass[row.status]}`}
                >
                  {row.status}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Why this order</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">{row.reason}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Implementation note</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{row.implementation}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DocsPage() {
  const navGroups = getNavGroups();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/35">
        <div className="bg-[radial-gradient(1200px_300px_at_-5%_-50%,rgba(73,160,164,0.22),transparent)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.13em] text-brand">
              Internal
            </span>
            <span className="inline-flex items-center rounded-full border border-zinc-700/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-500">
              Operating Handbook
            </span>
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-100">
            Inovense CRM Command Reference
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-zinc-500">
            Source of truth for the live operating system: host-split surfaces, lifecycle execution,
            proposal intelligence, payment/onboarding flow, client portal behavior, prospects, and
            decision-grade performance semantics. Keep stage truth strict and operator decisions explicit.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <nav className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
            <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-700">
              Jump To
            </p>
            <div className="flex flex-col gap-2">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.13em] text-zinc-700">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="rounded-md border border-zinc-800/70 bg-zinc-950/60 px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
                      >
                        {item.title}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="rounded-2xl border border-brand/25 bg-brand/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-brand">
              Hard Rule
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">
              Payment confirmation and project completion are separate truths.
              Paid does not mean delivered. Session activity does not mean lead creation.
            </p>
          </div>
        </aside>

        <div className="space-y-5">
          <OperatingStateNowSection />
          <CoreSystemLayersSection />
          <CanonicalDefinitionsSection />

          <section id="control-model" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionTag label="Ops" />
                  <AutomationTag label="Mixed" />
                  <h2 className="text-sm font-semibold text-zinc-100">Control Model</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Keep operator ownership and automation boundaries explicit at every stage.
                </p>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-3">
                {CONTROL_MODEL.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5"
                  >
                    <p className="text-sm font-medium text-zinc-200">{card.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{card.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="manual-vs-automatic" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionTag label="Ops" />
                  <AutomationTag label="Mixed" />
                  <h2 className="text-sm font-semibold text-zinc-100">Manual vs Automatic</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Quick reference for what operators own directly and what the CRM updates automatically.
                </p>
              </div>
              <div className="space-y-2 p-4">
                {MANUAL_AUTOMATION_REFERENCE.map((item) => (
                  <article
                    key={item.area}
                    className="grid gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5 md:grid-cols-[1fr_1.4fr_1.4fr]"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Area</p>
                      <p className="mt-1 text-sm font-medium text-zinc-200">{item.area}</p>
                      <span className="mt-2 inline-flex items-center rounded-full border border-zinc-700/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                        {item.automation}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Manual truth</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-300">{item.manual}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Automated behavior</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.auto}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <ActionEventMap />
          <PricingFramework />

          <section id="flow-reference" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionTag label="Flow" />
                  <AutomationTag label="Mixed" />
                  <h2 className="text-sm font-semibold text-zinc-100">Lifecycle Reference</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Use this flow as the operational spine. Status should mirror actual progression.
                </p>
              </div>
              <div className="space-y-2 p-4">
                {LEAD_FLOW_STEPS.map((item, index) => (
                  <div
                    key={item.step}
                    className="grid gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5 md:grid-cols-[28px_1fr_auto]"
                  >
                    <span className="text-sm font-semibold tabular-nums text-zinc-500">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{item.step}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{item.trigger}</p>
                    </div>
                    <span className="inline-flex h-fit items-center rounded-full border border-zinc-700/70 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <CurrentBuildOrderSection />
          <ScenarioPlaybooks />

          <section id="project-status-reference" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionTag label="Delivery" />
                  <AutomationTag label="Manual" />
                  <h2 className="text-sm font-semibold text-zinc-100">Project Status Reference</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Project status is delivery tracking only. Keep it separate from lifecycle and payment states.
                </p>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {PROJECT_STATUS_REFERENCE.map((item) => (
                  <div
                    key={item.value}
                    className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5"
                  >
                    <p className="text-sm font-medium text-zinc-200">{item.value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {SECTIONS.map((section) => (
            <HandbookSectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>

      <footer className="pb-1">
        <p className="text-center text-xs text-zinc-700">
          Internal only. Treat outdated workflow documentation as a system bug.
        </p>
      </footer>
    </div>
  );
}
