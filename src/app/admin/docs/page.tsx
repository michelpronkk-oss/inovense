import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | Inovense Admin",
  robots: { index: false, follow: false },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  tag?: string;
  blocks: Block[];
}

type Block =
  | { type: "text"; content: string }
  | { type: "list"; items: string[] }
  | { type: "field"; label: string; value: string }
  | { type: "rule"; label: string; items: string[] }
  | { type: "divider" };

// ── Content ──────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "lead-flow",
    title: "Lead Flow",
    tag: "Intake",
    blocks: [
      {
        type: "text",
        content:
          "A lead enters through the /intake form. A record is created in Supabase with status new. A confirmation email is sent to the prospect and a notification email goes to the team.",
      },
      {
        type: "rule",
        label: "When to action",
        items: [
          "Review new leads within 24 hours.",
          "Move to contacted once you have reached out.",
          "Move to qualified once you have a clear picture of their need and budget.",
          "Move to proposal once you are ready to send pricing.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not skip statuses. The funnel only works if stages are accurate.",
          "Do not create a separate record for the same company. One lead per company.",
          "Do not mark as won until payment is received.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Qualified lead moves to the proposal stage. Disqualified leads get status disqualified with a note.",
      },
    ],
  },
  {
    id: "proposal-flow",
    title: "Proposal Flow",
    tag: "Commercial",
    blocks: [
      {
        type: "text",
        content:
          "Proposals are sent from within the lead record using the email composer. Select the proposal template, confirm pricing and lane, and send directly from the CRM.",
      },
      {
        type: "rule",
        label: "When to use",
        items: [
          "After a lead is qualified and scope is reasonably clear.",
          "When the prospect has asked for pricing.",
          "After a discovery call where you have confirmed the lane.",
        ],
      },
      {
        type: "rule",
        label: "What to do",
        items: [
          "Set the lane (Build, Systems, or Growth) on the lead record before sending.",
          "Confirm the monthly rate in the commercial section.",
          "Use the proposal email template - do not improvise pricing in a plain email.",
          "Move the lead to status proposal-sent immediately after sending.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not send a proposal without setting the lane and rate on the record.",
          "Do not negotiate pricing outside the CRM. Log any changes as a note.",
          "Do not send revised proposals without updating the commercial fields first.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Follow up within 3-5 days if no response. When the prospect agrees, move to payment collection.",
      },
    ],
  },
  {
    id: "payment-flow",
    title: "Payment Flow",
    tag: "Commercial",
    blocks: [
      {
        type: "text",
        content:
          "Payment is collected via Stripe. Send the Stripe payment link from within the lead record. Do not collect payment outside of the standard flow.",
      },
      {
        type: "rule",
        label: "When to use",
        items: [
          "After verbal or written agreement on scope and pricing.",
          "Before any onboarding or access work begins.",
        ],
      },
      {
        type: "rule",
        label: "What to do",
        items: [
          "Send the Stripe link from the commercial section of the lead record.",
          "Move the lead to status payment-pending after sending the link.",
          "Confirm receipt of payment before starting work.",
          "Move to active only after payment clears.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not begin work before payment is confirmed.",
          "Do not accept payment via bank transfer or external method without logging it.",
          "Do not mark as active until payment is confirmed.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Once payment clears, move the lead to active and begin the onboarding checklist.",
      },
    ],
  },
  {
    id: "onboarding-flow",
    title: "Onboarding Flow",
    tag: "Delivery",
    blocks: [
      {
        type: "text",
        content:
          "Onboarding starts the moment a lead is marked active. The goal is to get the client set up, informed, and delivering assets within the first week.",
      },
      {
        type: "rule",
        label: "Standard onboarding checklist",
        items: [
          "Send the onboarding welcome email.",
          "Collect brand assets: logo, colors, fonts, tone guidance.",
          "Set up their Notion workspace or shared folder.",
          "Schedule the kickoff call if the lane warrants it.",
          "Confirm primary contact and communication channel.",
          "Begin first deliverable within the agreed window.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not begin deliverables before assets and brief are received.",
          "Do not rely on verbal-only briefs. Get it in writing in Notion.",
          "Do not skip the welcome email. It sets the tone.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Client transitions to steady-state delivery. Lead status stays active. Recurring check-ins logged as notes.",
      },
    ],
  },
  {
    id: "email-usage",
    title: "Email Usage",
    tag: "Comms",
    blocks: [
      {
        type: "text",
        content:
          "All client-facing emails are sent from the CRM using Resend. Templates are available for each stage of the flow. Do not send client emails outside the CRM unless the system is down.",
      },
      {
        type: "rule",
        label: "Available templates",
        items: [
          "Intake confirmation - auto-sent on form submit.",
          "Team notification - auto-sent on form submit.",
          "Proposal - sent manually from the lead record.",
          "Payment link - sent manually from the commercial section.",
          "Onboarding welcome - sent manually after payment clears.",
          "Custom - freeform composer for anything outside the templates.",
        ],
      },
      {
        type: "rule",
        label: "Rules",
        items: [
          "Always log sent emails in the lead record.",
          "Never use em dashes in copy. Use hyphens or periods.",
          "Keep tone premium and direct. No filler phrases.",
          "Test templates in a staging environment before changing them.",
        ],
      },
    ],
  },
  {
    id: "lane-playbooks",
    title: "Lane Playbooks",
    tag: "Delivery",
    blocks: [
      {
        type: "text",
        content:
          "Each service lane has a distinct scope, cadence, and deliverable standard. Assign the correct lane at qualification and confirm before sending a proposal.",
      },
      {
        type: "rule",
        label: "Build",
        items: [
          "Scope: website, landing page, or product build using Next.js, Framer, or Webflow.",
          "Cadence: project-based, typically 2-6 weeks.",
          "Deliverables: design, development, deployment, handoff.",
          "Pricing: one-time or milestone-based.",
          "Typical client: new brand, pre-launch, or rebrand situation.",
        ],
      },
      {
        type: "rule",
        label: "Systems",
        items: [
          "Scope: CRM, automation, operational infrastructure, or internal tooling.",
          "Cadence: project-based with optional retainer for maintenance.",
          "Deliverables: working system, documentation, access handoff.",
          "Pricing: project fee or monthly retainer.",
          "Typical client: growing business with broken ops or manual workflows.",
        ],
      },
      {
        type: "rule",
        label: "Growth",
        items: [
          "Scope: content strategy, organic posting, short-form video, LinkedIn or Instagram presence.",
          "Cadence: monthly retainer.",
          "Deliverables: content plan, post drafts, scheduling, reporting.",
          "Pricing: monthly flat rate.",
          "Typical client: established brand with no consistent content output.",
        ],
      },
    ],
  },
  {
    id: "pricing-notes",
    title: "Pricing Notes",
    tag: "Commercial",
    blocks: [
      {
        type: "text",
        content:
          "Pricing is set by lane and scope. Standard ranges are noted below. These are internal reference only - do not share this page with clients.",
      },
      {
        type: "rule",
        label: "Build",
        items: [
          "Landing page or simple site: from 1,200.",
          "Full website with CMS: from 2,500.",
          "Custom product or app: scoped individually, typically 4,000+.",
        ],
      },
      {
        type: "rule",
        label: "Systems",
        items: [
          "CRM setup or automation build: from 1,500.",
          "Full ops infrastructure: scoped individually.",
          "Maintenance retainer: from 300/month.",
        ],
      },
      {
        type: "rule",
        label: "Growth",
        items: [
          "Content retainer: from 800/month.",
          "Full content + strategy: from 1,500/month.",
        ],
      },
      {
        type: "rule",
        label: "Discount policy",
        items: [
          "Do not discount without a clear reason.",
          "Multi-lane or long-term commitments can justify 10-15% off.",
          "Log any discount in the lead record with a note explaining why.",
        ],
      },
    ],
  },
  {
    id: "creative-usage",
    title: "Creative and Posting",
    tag: "Operations",
    blocks: [
      {
        type: "text",
        content:
          "The Creative section in admin is for generating branded social content using canvas templates. It is used for both Inovense's own posts and for client deliverables under the Growth lane.",
      },
      {
        type: "rule",
        label: "When to use",
        items: [
          "Generating post visuals for Inovense social output.",
          "Producing client deliverables in the Growth lane.",
          "Creating testimonial or case study graphics.",
        ],
      },
      {
        type: "rule",
        label: "What to do",
        items: [
          "Select the correct template for the content type.",
          "Export at correct dimensions for the target platform.",
          "Store exports in the client folder or Notion before posting.",
          "Log posted content in the client's content tracker.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not post without a copy review.",
          "Do not use placeholder or lorem text in any export.",
          "Do not post client content without sign-off if the contract requires it.",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting and Edge Cases",
    tag: "Operations",
    blocks: [
      {
        type: "rule",
        label: "Lead submitted but no email received",
        items: [
          "Check Resend dashboard for delivery status.",
          "Check the lead record to confirm it was created.",
          "Verify the RESEND_API_KEY env variable is set in Vercel.",
          "Check spam folder on the receiving end.",
        ],
      },
      {
        type: "rule",
        label: "Stripe link not working",
        items: [
          "Regenerate the link from the Stripe dashboard.",
          "Confirm the product and price are active in Stripe.",
          "Check that the STRIPE_SECRET_KEY is set correctly in Vercel.",
        ],
      },
      {
        type: "rule",
        label: "Lead record showing stale data",
        items: [
          "Hard refresh the page.",
          "If still stale, check the Supabase table directly.",
          "If the update did not save, check for a server action error in the logs.",
        ],
      },
      {
        type: "rule",
        label: "Client wants to change lanes mid-engagement",
        items: [
          "Update the lane field on the lead record.",
          "Add a note with the reason and date.",
          "If pricing changes, send a revised proposal email.",
          "Do not backdate any payment records.",
        ],
      },
      {
        type: "rule",
        label: "Client wants to pause or cancel",
        items: [
          "Update the lead status to paused or churned as appropriate.",
          "Add a detailed note with the reason.",
          "Cancel or pause the Stripe subscription if applicable.",
          "Do not delete the lead record.",
        ],
      },
    ],
  },
];

// ── Components ───────────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-[#49A0A4] ring-1 ring-[#49A0A4]/30">
      {label}
    </span>
  );
}

function RuleBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-100">{section.title}</h2>
          {section.tag && <Tag label={section.tag} />}
        </div>

        {/* Blocks */}
        <div className="space-y-6">
          {section.blocks.map((block, i) => {
            if (block.type === "text") {
              return (
                <p key={i} className="text-sm leading-relaxed text-zinc-400">
                  {block.content}
                </p>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={i} className="space-y-1.5">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === "field") {
              return (
                <div key={i}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
                    {block.label}
                  </p>
                  <p className="text-sm text-zinc-300">{block.value}</p>
                </div>
              );
            }
            if (block.type === "rule") {
              return <RuleBlock key={i} label={block.label} items={block.items} />;
            }
            if (block.type === "divider") {
              return <hr key={i} className="border-zinc-800" />;
            }
            return null;
          })}
        </div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-zinc-100">Documentation</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Internal operating guide for the Inovense workflow. Not client-facing.
        </p>
      </div>

      {/* Jump links */}
      <nav className="mb-10 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Contents
        </p>
        <ol className="space-y-1.5">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex items-center gap-3 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
              >
                <span className="w-5 text-right text-xs text-zinc-700">{i + 1}.</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-10 text-center text-xs text-zinc-700">
        Internal use only. Keep this page current as the operating flow evolves.
      </p>
    </div>
  );
}
