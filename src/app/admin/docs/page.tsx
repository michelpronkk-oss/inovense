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
  { step: "Lead enters CRM", status: "new", trigger: "Intake form or manual lead creation" },
  { step: "Initial review", status: "reviewing", trigger: "Operator starts qualification work" },
  { step: "Qualified for commercial work", status: "qualified", trigger: "Lane and scope are clear enough for proposal" },
  { step: "Proposal sent", status: "proposal_sent", trigger: "Proposal email sent from CRM" },
  { step: "Decision captured", status: "payment_requested or lost", trigger: "Accept/decline recorded on proposal flow" },
  { step: "Deposit confirmed", status: "deposit_paid", trigger: "Mark deposit as paid action in CRM" },
  { step: "Onboarding sent", status: "onboarding_sent", trigger: "Onboarding email/link sent" },
  { step: "Onboarding submitted", status: "onboarding_completed", trigger: "Client submits onboarding form" },
  { step: "Delivery in progress", status: "active", trigger: "Operator moves to active once delivery starts" },
  { step: "Engagement closed", status: "won or lost", trigger: "Operator closes lifecycle state" },
];

const PROJECT_STATUS_REFERENCE = [
  { value: "Not started", meaning: "Delivery has not started yet." },
  { value: "Ready", meaning: "Preconditions are met and work can start." },
  { value: "Active", meaning: "Delivery is currently in progress." },
  { value: "Paused", meaning: "Delivery is intentionally paused." },
  { value: "Completed", meaning: "Delivery and handoff are actually complete." },
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
    title: "Payment Flow And Deposit Confirmation",
    tag: "Commercial",
    automation: "Mixed",
    summary:
      "Mark deposit as paid is a business event. First transition records payment state and triggers one premium confirmation email.",
    blocks: [
      {
        title: "Current behavior",
        tone: "reference",
        items: [
          "Mark deposit as paid sets deposit_paid_at and lead status deposit_paid.",
          "Server-side idempotency only allows first-time transition when deposit_paid_at was null.",
          "On first successful transition, CRM sends a branded deposit confirmation email automatically.",
          "Email language follows lead locale logic from lead_source.",
          "Email is logged as deposit_paid_confirmation in lead_email_log.",
        ],
      },
      {
        title: "Duplicate-send protection",
        tone: "guardrail",
        items: [
          "Repeated clicks after paid state do not resend the confirmation email.",
          "Email helper also checks existing lead_email_log for deposit_paid_confirmation before sending.",
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
          "Overview and Leads pages aggregate cash collected, outstanding, and completed revenue.",
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
    <div className={`rounded-xl border p-4 ${tone.cls}`}>
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
        <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SectionTag label={section.tag} />
            <AutomationTag label={section.automation} />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">{section.title}</h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-400">
            {section.summary}
          </p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {section.blocks.map((block) => (
            <BlockCard key={`${section.id}-${block.title}`} block={block} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/35">
        <div className="bg-[radial-gradient(1200px_300px_at_-5%_-50%,rgba(73,160,164,0.22),transparent)] px-6 py-6 md:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.13em] text-brand">
              Internal
            </span>
            <span className="inline-flex items-center rounded-full border border-zinc-700/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-500">
              Operating Handbook
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
            Inovense CRM Command Reference
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
            This is the source of truth for how we run lead lifecycle, commercial flow,
            AI-assisted proposal work, payment confirmation, and delivery state.
            Keep records precise. Keep automation boundaries strict.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Lead Flow</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">Status-driven and stage-true</p>
            </div>
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Agents</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">Assist content, no auto-send</p>
            </div>
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Payment Event</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">First paid mark auto-confirms by email</p>
            </div>
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Project Status</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">Manual. Completed means delivered.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <nav className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Jump To
            </p>
            <ol className="space-y-1.5">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
                  >
                    <span className="w-5 text-right text-[11px] text-zinc-700 group-hover:text-zinc-500">
                      {index + 1}.
                    </span>
                    <span className="leading-tight">{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="rounded-2xl border border-brand/25 bg-brand/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-brand">
              Hard Rule
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">
              Payment confirmation and project completion are separate truths.
              Paid does not mean delivered.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <section id="flow-reference" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SectionTag label="Flow" />
                  <AutomationTag label="Mixed" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100">Lifecycle Reference</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  Use this flow as the operational spine. Status should mirror actual progression.
                </p>
              </div>
              <div className="space-y-2 p-5">
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

          <section id="project-status-reference" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/70 bg-zinc-900/70 px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SectionTag label="Delivery" />
                  <AutomationTag label="Manual" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100">Project Status Reference</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  Project status is delivery tracking only. Keep it separate from lifecycle and payment states.
                </p>
              </div>
              <div className="grid gap-3 p-5 md:grid-cols-2">
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
