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
    id: "operating-flow",
    title: "Operating Flow",
    tag: "Reference",
    blocks: [
      {
        type: "text",
        content:
          "Every client engagement follows the same sequence from intake to active project. Each step maps to a specific lead status in the CRM. The flow is the same whether a lead enters through the intake form or is created manually.",
      },
      {
        type: "rule",
        label: "The standard sequence",
        items: [
          "1. Lead enters CRM. Status: new.",
          "2. Lead is reviewed and evaluated. Status: reviewing.",
          "3. Lead is qualified. Scope and budget are clear. Status: qualified.",
          "4. Proposal is prepared and sent. Status: proposal_sent.",
          "5. Proposal is accepted. Mark the decision on the lead record.",
          "6. Contract is generated and sent. Log as a note on the lead record.",
          "7. Payment request is sent. Status: payment_requested.",
          "8. Deposit is received and confirmed. Status: deposit_paid.",
          "9. Onboarding is sent. Status: onboarding_sent.",
          "10. Onboarding is completed. Status: onboarding_completed.",
          "11. Project is active. Status: active.",
        ],
      },
      {
        type: "field",
        label: "Contracts",
        value: "Contracts are recommended for all engagements above a basic scope. For very small or informal arrangements, moving directly from accepted proposal to payment request is acceptable. Use judgement and log the decision.",
      },
      {
        type: "field",
        label: "Manual leads",
        value: "Leads from referrals, DMs, calls, or direct contact are created manually in the CRM. They enter at status new and follow the same flow from that point forward.",
      },
    ],
  },
  {
    id: "dutch-layer",
    title: "Dutch Conversion Layer",
    tag: "Strategy",
    blocks: [
      {
        type: "text",
        content:
          "The Inovense brand operates English-first. The Dutch layer is a focused conversion addition, not a full bilingual site. It targets Dutch-speaking visitors and supports Dutch-market conversion without duplicating the entire site or brand system in Dutch.",
      },
      {
        type: "rule",
        label: "What the Dutch layer is",
        items: [
          "A focused set of Dutch-language pages under /nl covering three service lanes and a dedicated intake path.",
          "Designed to improve conversion for Dutch visitors who prefer to engage in Dutch.",
          "Not a translation of the full site. English pages remain the primary brand layer.",
          "Public socials, case studies, and brand communications remain English-first.",
        ],
      },
      {
        type: "rule",
        label: "Dutch layer routes",
        items: [
          "/nl: Dutch hub and brand entry point.",
          "/nl/web-design: Dutch web design service page.",
          "/nl/ai-automation: Dutch AI automation service page.",
          "/nl/shopify-design: Dutch Shopify design service page.",
          "/nl/intake: Dutch intake form. Feeds the same CRM as the English intake.",
        ],
      },
      {
        type: "rule",
        label: "When to use Dutch",
        items: [
          "When a lead entered through /nl/intake and has communicated in Dutch.",
          "When direct outreach or a referral is with a Dutch-speaking contact who responds better in Dutch.",
          "When running a Dutch-specific campaign or targeting Dutch-market channels.",
          "Do not force Dutch on leads who have engaged in English. Follow their lead.",
        ],
      },
      {
        type: "rule",
        label: "What stays English-only",
        items: [
          "The main site and all English routes: /, /web-design, /ai-automation, /shopify-design, /intake, and all others.",
          "Public socials. Socials remain English-first unless a Dutch campaign is explicitly planned.",
          "Proposals, contracts, and formal documents. Default to English. Dutch only if the client has communicated exclusively in Dutch and Dutch is clearly preferred.",
          "CRM email templates. Templates are English. Use the custom composer for Dutch-language emails.",
        ],
      },
      {
        type: "rule",
        label: "Handling Dutch leads operationally",
        items: [
          "Dutch leads enter the CRM identically to English leads. Status flow, proposal, contract, and payment steps are the same.",
          "Note on the lead record if the client prefers Dutch communication. Set it early.",
          "When writing a proposal or email to a Dutch lead, use Dutch in the body if the relationship warrants it.",
          "Contracts remain in English by default. English is the standard contract language.",
          "Do not create a parallel Dutch CRM flow. One flow, one record. Language is a communication preference, not a separate system.",
        ],
      },
      {
        type: "field",
        label: "Coherence rule",
        value: "If a visitor enters through /nl, keep them in the Dutch path through intake and initial contact. Once they are in the CRM, route them through the standard flow. Language preference is a note on the record, not a branching system.",
      },
    ],
  },
  {
    id: "lead-flow",
    title: "Lead Flow",
    tag: "Intake",
    blocks: [
      {
        type: "text",
        content:
          "A lead enters through the /intake form, the /nl/intake Dutch form, or is created manually in the CRM. A record is created in Supabase with status new. For form submissions, a confirmation email goes to the prospect and a notification email goes to the team.",
      },
      {
        type: "rule",
        label: "Status progression",
        items: [
          "new: lead has just entered. Review within 24 hours.",
          "reviewing: you have looked at the lead and are evaluating fit.",
          "qualified: scope, lane, and budget are clear. Ready for proposal.",
          "lost: lead is not a fit or has gone cold. Add a brief note explaining why.",
        ],
      },
      {
        type: "rule",
        label: "What to do",
        items: [
          "Move status to reviewing when you start evaluating. Do not leave leads sitting at new.",
          "Move to qualified only when you have enough to write a real proposal.",
          "Set the service lane and source on the record before moving past reviewing.",
          "Add a note any time there is meaningful contact or a decision point.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not skip statuses. The funnel only works if stages reflect reality.",
          "Do not create a second record for the same company. One lead per company.",
          "Do not leave a lead at new for more than 24 hours without reviewing it.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "A qualified lead moves to proposal preparation. A lead that is not a fit is marked lost with a note. No lead should be left in an ambiguous state.",
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
          "Proposals are sent from within the lead record using the email composer. Set the lane and commercial fields before sending. The proposal email template pulls from the CRM fields.",
      },
      {
        type: "rule",
        label: "When to send",
        items: [
          "After a lead is qualified and scope is reasonably clear.",
          "When the prospect has asked for pricing.",
          "After a discovery call where you have confirmed the lane and fit.",
        ],
      },
      {
        type: "rule",
        label: "What to do",
        items: [
          "Set the lane (Build, Systems, or Growth) on the lead record before sending.",
          "Set the total value and deposit in the commercial section. Not just a monthly rate.",
          "Use the proposal email template. Do not improvise pricing in a plain email.",
          "Move the lead to status proposal_sent immediately after sending.",
          "Follow up within 3 to 5 days if no response.",
          "When the proposal is accepted: mark the decision as accepted on the lead record before proceeding.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not send a proposal without setting lane and commercial fields on the record.",
          "Do not negotiate pricing outside the CRM. Log any agreed changes as a note.",
          "Do not send a revised proposal without updating the commercial fields first.",
          "Do not move to contract or payment before the proposal decision is logged.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Accepted proposal moves to contract generation. Declined or expired proposals are marked lost with a note. If the scope changes after acceptance, send a revised proposal and re-log the decision.",
      },
    ],
  },
  {
    id: "contract-generation",
    title: "Contract Generation",
    tag: "Commercial",
    blocks: [
      {
        type: "text",
        content:
          "Contracts are generated as PDF documents directly from the lead record. Fields are pre-filled from CRM data and reviewed before downloading. Current version is PDF generation only. E-sign is not yet part of the flow.",
      },
      {
        type: "rule",
        label: "When to generate a contract",
        items: [
          "After the proposal has been accepted and the decision is logged on the lead record.",
          "Before sending the payment request.",
          "For any engagement where scope, IP, or commercial terms need to be formally documented.",
          "Always for collaboration or partner arrangements.",
        ],
      },
      {
        type: "rule",
        label: "Which contract type to use",
        items: [
          "Project Agreement: one-time build with defined scope, deliverables, and end point. Use for Build lane and scoped Systems projects.",
          "Retainer Agreement: ongoing monthly engagement. Use for Growth lane and Systems retainers.",
          "Collaboration Agreement: partner or referral arrangement. Use when working with another party rather than a direct client.",
        ],
      },
      {
        type: "rule",
        label: "Fields to confirm before generating",
        items: [
          "Engagement title: must reflect what was agreed, not just the raw CRM project type.",
          "Start date: the actual agreed start date, not a placeholder.",
          "Scope summary: edit to match exactly what was accepted. Remove raw intake text.",
          "Total value and deposit: must match the accepted proposal exactly.",
          "Payment terms: default is 7 days from invoice. Update if otherwise agreed.",
          "Effective date: the date the agreement becomes active. Usually today or the start date.",
        ],
      },
      {
        type: "rule",
        label: "After generating",
        items: [
          "Review the PDF before sending. Check all fields are correct.",
          "Send via email. Use the email composer or send directly from your mail client.",
          "Log a note on the lead record: contract sent, date, and contract type.",
          "When the signed copy is returned, store it and log receipt as a note.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Once the contract is sent and agreed, move to the payment request step. Do not send the payment link before the contract is in place for material engagements.",
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
        label: "When to send the payment request",
        items: [
          "After the proposal has been accepted and the contract has been sent.",
          "Before any onboarding, access requests, or delivery work begins.",
          "If skipping the contract for a small engagement, send after the proposal is accepted.",
        ],
      },
      {
        type: "rule",
        label: "What to do",
        items: [
          "Send the Stripe link from the commercial section of the lead record.",
          "Move the lead to status payment_requested immediately after sending the link.",
          "Confirm receipt of payment before starting any work.",
          "Move to deposit_paid only after payment is confirmed.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not begin work before deposit is confirmed.",
          "Do not accept payment via bank transfer or external method without logging it in the CRM.",
          "Do not mark deposit_paid until the payment has actually cleared.",
          "Do not send the payment link before the contract is in place for material engagements.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Once deposit is confirmed and the status is deposit_paid, proceed to sending the onboarding link.",
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
          "Onboarding begins after the deposit is confirmed. The lead moves from deposit_paid to onboarding_sent when the onboarding link is sent, and to onboarding_completed when the client submits their brief. The project becomes active after onboarding completes.",
      },
      {
        type: "rule",
        label: "Status progression",
        items: [
          "deposit_paid: payment confirmed. Ready to send onboarding.",
          "onboarding_sent: onboarding link has been sent to the client.",
          "onboarding_completed: client has submitted the onboarding form.",
          "active: project is running. Deliverables are in progress.",
        ],
      },
      {
        type: "rule",
        label: "Standard onboarding checklist",
        items: [
          "Send the onboarding welcome email and the onboarding link from the lead record.",
          "Move lead to onboarding_sent immediately after sending.",
          "Once the client submits: review their onboarding brief in the lead record.",
          "Collect any outstanding brand assets: logo, colors, fonts, tone guidance.",
          "Set up their Notion workspace or shared folder if applicable.",
          "Schedule the kickoff call if the lane warrants it.",
          "Confirm primary contact and preferred communication channel.",
          "Move to active and begin the first deliverable within the agreed window.",
        ],
      },
      {
        type: "rule",
        label: "What not to do",
        items: [
          "Do not begin deliverables before the onboarding form is submitted and assets are received.",
          "Do not rely on verbal-only briefs. Get everything confirmed in the onboarding form or Notion.",
          "Do not skip the welcome email. It sets the tone for the engagement.",
          "Do not mark active before onboarding is genuinely complete.",
        ],
      },
      {
        type: "field",
        label: "What happens next",
        value: "Client transitions to steady-state delivery. Lead status stays active. Recurring check-ins and decisions are logged as notes on the lead record.",
      },
    ],
  },
  {
    id: "client-access",
    title: "Client Access Management",
    tag: "Delivery",
    blocks: [
      {
        type: "text",
        content:
          "Every project that touches a client platform requires access. How that access is obtained, stored, and closed out reflects directly on how professional the engagement is. Default to the safest method available. Treat credentials as temporary by design.",
      },
      {
        type: "rule",
        label: "Access hierarchy: prefer in this order",
        items: [
          "Partner or collaborator access: platform-native, role-scoped, revocable without a password change.",
          "Invite-based access: a named user account with the minimum role needed.",
          "Temporary credentials with a clear plan for rotation after delivery.",
          "Direct password sharing: only if the platform offers nothing else. Treat as exceptional.",
        ],
      },
      {
        type: "rule",
        label: "When to request partner or collaborator access",
        items: [
          "Shopify: use the collaborator access request. Never ask for the owner login.",
          "Meta Business Suite: request access to the ad account or page by role via Business Manager. Do not ask for personal Facebook login.",
          "Google Analytics: add as an Editor or Viewer via the property access settings.",
          "Google Search Console: add as a Full User or Restricted User via Settings.",
          "Ad accounts (Google Ads, Meta Ads): user-level access only. Not the master account login.",
          "Never request ownership or admin transfer unless the project scope explicitly requires it.",
        ],
      },
      {
        type: "rule",
        label: "When invite-based access is the right method",
        items: [
          "The platform supports named users with role-based permissions.",
          "You are working alongside the client rather than acting as them.",
          "Access needs to be scoped to a specific workspace, project, or view.",
          "Typical platforms: Notion, Figma, Google Workspace, Klaviyo, Mailchimp, HubSpot, most modern CRMs.",
          "Request the minimum role needed. Viewer access where write access is not required.",
        ],
      },
      {
        type: "rule",
        label: "If credentials must be shared directly",
        items: [
          "Request only the login needed for the specific task. Avoid blanket admin access.",
          "Never store passwords in email threads, Slack messages, or plain-text notes.",
          "Ask the client to share via a secure method: 1Password share link, a secure note, or a temporary password they intend to rotate.",
          "Log that credentials were received, which platform, and what they are used for in the lead record notes.",
          "Plan for rotation: flag at project close that the client should change the password on any shared account.",
        ],
      },
      {
        type: "rule",
        label: "Keeping access organized",
        items: [
          "Log every access grant in the lead record: platform, access type, date received, purpose.",
          "Keep access notes on the lead record, not in email threads or personal notes.",
          "Do not forward access or credentials to third parties without explicit client consent.",
          "If a subcontractor needs access, confirm with the client first and log who has it.",
        ],
      },
      {
        type: "rule",
        label: "Access revocation and cleanup",
        items: [
          "At project close, review what access is still active and flag anything that should be removed.",
          "For collaborator or partner access: remind the client to revoke it if they want to after handoff.",
          "For invite-based access: remove yourself from the workspace or request removal.",
          "For shared credentials: note in the lead record that the client should rotate the password on that account.",
          "Log the cleanup action and date in the lead record. Do not rely on memory.",
        ],
      },
      {
        type: "rule",
        label: "Platform quick reference",
        items: [
          "Shopify: Settings > Users > Collaborator requests. Assign staff permissions, not owner access.",
          "Meta Business Suite: Business Settings > Partners or Users. Request by email with appropriate role.",
          "Google Analytics 4: Admin > Property Access Management. Editor for active work, Viewer for reporting only.",
          "Google Search Console: Settings > Users and Permissions. Full User or Restricted User.",
          "Notion: Invite via workspace or specific page. Guest access for external collaborators.",
          "Klaviyo / Mailchimp: Invite as Manager or Editor. Not account owner.",
          "Ecommerce admin panels: staff account with scoped permissions where the platform supports it.",
          "Custom CRM or internal tools: request a named user account with the role relevant to the task.",
        ],
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
        label: "Dutch communication",
        items: [
          "CRM email templates are English. For Dutch leads who prefer Dutch, use the custom composer and write in Dutch.",
          "Proposals to Dutch leads may be written in Dutch if the client relationship has been conducted in Dutch.",
          "Contracts default to English regardless of lead language. English is the standard contract language.",
          "Log language preference on the lead record so it carries forward to every subsequent communication.",
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
