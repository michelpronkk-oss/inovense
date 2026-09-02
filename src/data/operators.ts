// Auterim — operators roster + role glyphs (simple line icons, 24x24, stroke=currentColor)
// Single source of truth for the 15 operators, ported from design_handoff_inovense/operators-data.js

export type LoopStep = {
  k: "Detect" | "Prepare" | "Approve" | "Execute" | "Log";
  t: string;
};

export type Operator = {
  name: string;
  tag: string;
  color: string;
  glyph: string;
  mission: string;
  loop: LoopStep[];
};

export const GLYPHS: Record<string, string> = {
  trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M14 6h7v7"/>',
  client: '<circle cx="9" cy="8" r="3.1"/><path d="M3.6 20c0-3.3 2.4-5.4 5.4-5.4 1.1 0 2.1.3 3 .9"/><path d="m15.5 18 1.7 1.7 3.3-3.4"/>',
  bars: '<path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/>',
  mega: '<path d="M3 11v2l11 5V6L3 11Z"/><path d="M18 8a3.5 3.5 0 0 1 0 8"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="M20 20l-5.2-5.2"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h5"/>',
  star: '<path d="M12 4.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>',
  memory: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  dollar: '<path d="M12 2.5v19"/><path d="M16.5 6.5H9.8a3.3 3.3 0 0 0 0 6.6h4.4a3.3 3.3 0 0 1 0 6.6H6.5"/>',
  support: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.3"/><path d="m6.2 6.2 3.4 3.4M14.4 14.4l3.4 3.4M17.8 6.2l-3.4 3.4M9.6 14.4l-3.4 3.4"/>',
  hiring: '<circle cx="9" cy="8" r="3.1"/><path d="M3.6 20c0-3.3 2.4-5.4 5.4-5.4s5.4 2.1 5.4 5.4"/><path d="M19 8.5v5M16.5 11h5"/>',
  social: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.1 10.9 7.8-3.9M8.1 13.1l7.8 3.9"/>',
  layout: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.2h17M9.2 9.2v10.3"/>',
  auto: '<rect x="3" y="4" width="6" height="5" rx="1.2"/><rect x="15" y="9.5" width="6" height="5" rx="1.2"/><rect x="3" y="15" width="6" height="5" rx="1.2"/><path d="M9 6.5h2.8a2 2 0 0 1 2 2v.5M9 17.5h2.8a2 2 0 0 0 2-2v-.5"/>',
};

export const OPERATORS: Operator[] = [
  {
    name: "Revenue Operator", tag: "Sales · Pipeline", color: "#4DE8E1", glyph: "trend",
    mission: "Makes sure no lead, deal or follow-up ever slips through.",
    loop: [
      { k: "Detect", t: "Inbound leads, aging deals, missed replies and follow-up openings." },
      { k: "Prepare", t: "Follow-up emails, CRM notes, deal updates and proposal angles." },
      { k: "Approve", t: "External emails, pricing and deal-stage changes." },
      { k: "Execute", t: "Sends and updates through Gmail and HubSpot." },
      { k: "Log", t: "Logs every action and learns from approvals and rejections." },
    ],
  },
  {
    name: "Client Flow Operator", tag: "Intake · Onboarding", color: "#5B8DEF", glyph: "client",
    mission: "Keeps client communication, onboarding and delivery tight.",
    loop: [
      { k: "Detect", t: "New client questions, missing info, onboarding steps and open loops." },
      { k: "Prepare", t: "Intake summaries, checklists, handoff notes and client updates." },
      { k: "Approve", t: "Any client-facing message or document." },
      { k: "Execute", t: "Acts through Gmail, Drive, Notion and project tools." },
      { k: "Log", t: "Stores status, next steps and client context in memory." },
    ],
  },
  {
    name: "Operations Operator", tag: "Reports · Internal", color: "#51D88A", glyph: "bars",
    mission: "Gives the company daily oversight and keeps work moving.",
    loop: [
      { k: "Detect", t: "Pending approvals, blockers, missed tasks and workflow drift." },
      { k: "Prepare", t: "Daily and weekly operating briefs, task summaries and updates." },
      { k: "Approve", t: "Team broadcasts and external actions." },
      { k: "Execute", t: "Routes tasks and reminders to the right person." },
      { k: "Log", t: "Tracks operational status so nothing stalls." },
    ],
  },
  {
    name: "Marketing Operator", tag: "Content · Campaigns", color: "#A78BFA", glyph: "mega",
    mission: "Does not just advise on marketing, it prepares and runs the work.",
    loop: [
      { k: "Detect", t: "Campaign openings, content gaps, weak pages and performance signals." },
      { k: "Prepare", t: "Ad angles, hooks, captions, copy, visual prompts and briefs." },
      { k: "Approve", t: "Publishing, ad spend, visuals and claims." },
      { k: "Execute", t: "Launches posts and schedules through connected tools." },
      { k: "Log", t: "Monitors performance and proposes pause, test or scale." },
    ],
  },
  {
    name: "SEO Implementation Operator", tag: "Search · Implementation", color: "#E0A35E", glyph: "search",
    mission: "Produces SEO output that ships, not just advice.",
    loop: [
      { k: "Detect", t: "Keyword gaps, weak pages, missing metadata and internal-link openings." },
      { k: "Prepare", t: "Page briefs, meta titles, descriptions, FAQs and headings." },
      { k: "Approve", t: "Live changes to pages and metadata." },
      { k: "Execute", t: "Pushes CMS or GitHub updates, or files implementation tasks." },
      { k: "Log", t: "Records which pages changed and which openings remain." },
    ],
  },
  {
    name: "Proposal & Quote Operator", tag: "Proposals · Pricing", color: "#6EC7F2", glyph: "doc",
    mission: "Turns proposals, quotes and scopes around faster and cleaner.",
    loop: [
      { k: "Detect", t: "Proposal opportunities from leads, calls, mail and CRM." },
      { k: "Prepare", t: "Scope, deliverables, timeline and pricing rationale." },
      { k: "Approve", t: "Pricing, terms and external sending." },
      { k: "Execute", t: "Sends and updates through Gmail and CRM." },
      { k: "Log", t: "Remembers what converts and which prices get rejected." },
    ],
  },
  {
    name: "Review & Proof Operator", tag: "Testimonials · Proof", color: "#F5C26B", glyph: "star",
    mission: "Collects and reuses reviews, testimonials and proof systematically.",
    loop: [
      { k: "Detect", t: "Finished projects, happy clients and proof moments." },
      { k: "Prepare", t: "Review requests, testimonial snippets, case blocks and social proof." },
      { k: "Approve", t: "Client name, logo, result claims and publication." },
      { k: "Execute", t: "Sends review requests and proof updates." },
      { k: "Log", t: "Stores approved proof for marketing, sales and site copy." },
    ],
  },
  {
    name: "Knowledge & Memory Operator", tag: "Company · Memory", color: "#8B9DF7", glyph: "memory",
    mission: "Makes Auterim smarter about each company over time.",
    loop: [
      { k: "Detect", t: "Approved and rejected outputs, policies, pricing, tone and rules." },
      { k: "Prepare", t: "Tone of voice, offers, client profiles, banned claims and templates." },
      { k: "Approve", t: "Major memory changes like pricing, claims or core rules." },
      { k: "Execute", t: "Updates company memory after runs and decisions." },
      { k: "Log", t: "Keeps every operator aligned to the business." },
    ],
  },
  {
    name: "Approval & Risk Operator", tag: "Safety · Audit", color: "#E8836B", glyph: "shield",
    mission: "Guards safety, policy and the audit trail across every operator.",
    loop: [
      { k: "Detect", t: "Classifies each action as low, medium or high risk." },
      { k: "Prepare", t: "Decides whether approval is needed and who must sign off." },
      { k: "Approve", t: "Blocks forbidden actions and unapproved sends." },
      { k: "Execute", t: "Explains, in plain terms, why something needs approval." },
      { k: "Log", t: "Keeps the audit trail: what, why, by whom and via which tool." },
    ],
  },
  {
    name: "Finance & Billing Operator", tag: "Revenue · Billing", color: "#5FD3A8", glyph: "dollar",
    mission: "Watches revenue, payments, invoices and financial signals.",
    loop: [
      { k: "Detect", t: "Failed payments, unpaid invoices, churn risk and plan changes." },
      { k: "Prepare", t: "Payment follow-ups, billing notes and revenue summaries." },
      { k: "Approve", t: "Sensitive client comms and financial changes." },
      { k: "Execute", t: "Sends mails, CRM notes and billing updates." },
      { k: "Log", t: "Logs financial signals back to Revenue and Operations." },
    ],
  },
  {
    name: "Support Operator", tag: "Tickets · Helpdesk", color: "#66D0E0", glyph: "support",
    mission: "Resolves support faster without losing control.",
    loop: [
      { k: "Detect", t: "Questions, complaints, bugs, refunds and recurring themes." },
      { k: "Prepare", t: "Reply drafts, issue summaries and escalation notes." },
      { k: "Approve", t: "Sensitive replies, refunds and public answers." },
      { k: "Execute", t: "Sends replies and updates tickets." },
      { k: "Log", t: "Saves recurring questions as FAQ and memory." },
    ],
  },
  {
    name: "Hiring & Team Operator", tag: "People · Onboarding", color: "#C58BF0", glyph: "hiring",
    mission: "Supports hiring, onboarding and team processes.",
    loop: [
      { k: "Detect", t: "Applications, open roles, team blockers and onboarding tasks." },
      { k: "Prepare", t: "Candidate summaries, interview notes and onboarding checklists." },
      { k: "Approve", t: "Candidate comms and contract-sensitive actions." },
      { k: "Execute", t: "Sends mails, calendar invites and task updates." },
      { k: "Log", t: "Tracks hiring pipeline and onboarding status." },
    ],
  },
  {
    name: "Social & Community Operator", tag: "Social · Community", color: "#7AA8FF", glyph: "social",
    mission: "Keeps social presence and community running consistently.",
    loop: [
      { k: "Detect", t: "Content moments, product updates, proof and community openings." },
      { k: "Prepare", t: "Posts, replies, threads, announcements and community updates." },
      { k: "Approve", t: "Publishing, sensitive replies and claims." },
      { k: "Execute", t: "Posts and schedules through social tools." },
      { k: "Log", t: "Learns which formats, hooks and topics work best." },
    ],
  },
  {
    name: "Website Conversion Operator", tag: "Website · CRO", color: "#5ED6C0", glyph: "layout",
    mission: "Continuously improves the site and landing pages.",
    loop: [
      { k: "Detect", t: "Weak sections, unclear CTAs, drop-off points and copy gaps." },
      { k: "Prepare", t: "Stronger hero copy, CTAs, sections, FAQs and conversion notes." },
      { k: "Approve", t: "Any live change to the site." },
      { k: "Execute", t: "Files design and dev tasks or stages CMS/GitHub updates." },
      { k: "Log", t: "Records what shipped and what to test next." },
    ],
  },
  {
    name: "Automation Architect Operator", tag: "Workflows · Design", color: "#9B8CFF", glyph: "auto",
    mission: "Spots new workflows and proposes them safely.",
    loop: [
      { k: "Detect", t: "Repeated manual tasks and inefficient processes." },
      { k: "Prepare", t: "New automations with triggers, tools, approvals and logs." },
      { k: "Approve", t: "Required before any new workflow goes live." },
      { k: "Execute", t: "Stages workflow configs for the runtime." },
      { k: "Log", t: "Flags required connectors and the risk level." },
    ],
  },
];
