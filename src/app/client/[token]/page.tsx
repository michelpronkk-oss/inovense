import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClientLocaleForLeadSource, type ClientLocale } from "@/lib/client-locale";
import { derivePaymentState } from "@/lib/payment-utils";
import { formatCurrencyAmount } from "@/lib/currency";
import { resolveClientFacingCurrencyCode } from "@/lib/market";

export const dynamic = "force-dynamic";

type PortalLead = {
  id: string;
  full_name: string;
  company_name: string;
  work_email: string;
  lead_source: string | null;
  service_lane: string;
  project_type: string;
  project_details: string;
  status: string;
  project_status: string;
  onboarding_status: string;
  onboarding_token: string | null;
  onboarding_sent_at: string | null;
  onboarding_completed_at: string | null;
  proposal_token: string | null;
  proposal_status: string | null;
  proposal_title: string | null;
  proposal_intro: string | null;
  proposal_scope: string | null;
  proposal_price: number | null;
  proposal_deposit: number | null;
  proposal_decision: "accepted" | "declined" | null;
  proposal_sent_at: string | null;
  payment_link: string | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  final_payment_paid_at: string | null;
  project_start_date: string | null;
  local_currency_code: string | null;
};

type PortalStatus = "review" | "ready" | "onboarding" | "active" | "completed";
type PortalPhase = "proposal" | "payment" | "onboarding" | "delivery" | "completed";

type PortalCopy = {
  portalLabel: string;
  pageTitle: string;
  invalidMessage: string;
  invalidHelpPrefix: string;
  overviewLabel: string;
  statusLabel: string;
  currentStepLabel: string;
  nextActionLabel: string;
  docsLabel: string;
  paymentLabel: string;
  summaryLabel: string;
  contactLabel: string;
  projectStartLabel: string;
  depositRow: string;
  finalRow: string;
  pending: string;
  paid: string;
  paidOnPrefix: string;
  availableNow: string;
  availableSoon: string;
  completedTag: string;
  noActionTitle: string;
  noActionBody: string;
  replyLine: string;
  privateLine: (firstName: string, company: string) => string;
  docs: {
    proposalTitle: string;
    contractTitle: string;
    paymentTitle: string;
    onboardingTitle: string;
    openProposal: string;
    openPayment: string;
    openOnboarding: string;
    requestContract: string;
    proposalAvailable: string;
    proposalUnavailable: string;
    contractBody: string;
    paymentAvailable: string;
    paymentAfterProposal: string;
    paymentUnavailable: string;
    onboardingAvailable: string;
    onboardingAfterPayment: string;
    onboardingCompleted: string;
    onboardingUnavailable: string;
  };
  statusNames: Record<PortalStatus, string>;
  statusDescriptions: Record<PortalStatus, string>;
  stepText: Record<PortalStatus, string>;
  nextAction: {
    reviewProposalTitle: string;
    reviewProposalBody: string;
    payDepositTitle: string;
    payDepositBody: string;
    payDepositNoLinkBody: string;
    onboardingTitle: string;
    onboardingBody: string;
    onboardingComingTitle: string;
    onboardingComingBody: string;
    kickoffPrepTitle: string;
    kickoffPrepBody: string;
    deliveryTitle: string;
    deliveryBody: string;
    completedTitle: string;
    completedBody: string;
  };
  paymentStateText: {
    proposalPhase: string;
    noPrice: string;
    unpaid: string;
    depositPaid: string;
    fullyPaid: string;
  };
  summaryFallback: string;
};

const PORTAL_COPY: Record<ClientLocale, PortalCopy> = {
  en: {
    portalLabel: "Project Workspace",
    pageTitle: "Project Workspace",
    invalidMessage: "This workspace link is invalid or no longer available.",
    invalidHelpPrefix: "If this looks wrong, contact us at",
    overviewLabel: "Overview",
    statusLabel: "Project stage",
    currentStepLabel: "Current step",
    nextActionLabel: "Next action",
    docsLabel: "Key items",
    paymentLabel: "Payment",
    summaryLabel: "Scope summary",
    contactLabel: "Contact",
    projectStartLabel: "Planned kickoff",
    depositRow: "Deposit",
    finalRow: "Final payment",
    pending: "Pending",
    paid: "Paid",
    paidOnPrefix: "Confirmed on",
    availableNow: "Available",
    availableSoon: "Coming up",
    completedTag: "Completed",
    noActionTitle: "No action needed right now.",
    noActionBody: "We will contact you when the next input is needed.",
    replyLine: "Reply to your latest Inovense email or contact",
    privateLine: (firstName, company) =>
      `This private workspace is intended for ${firstName} at ${company}.`,
    docs: {
      proposalTitle: "Proposal",
      contractTitle: "Contract",
      paymentTitle: "Payment",
      onboardingTitle: "Onboarding",
      openProposal: "Open proposal",
      openPayment: "Open payment",
      openOnboarding: "Open onboarding",
      requestContract: "Request contract copy",
      proposalAvailable:
        "Your proposal is available here for review and confirmation.",
      proposalUnavailable: "Proposal will appear here once shared.",
      contractBody: "Contract details are shared directly in your agreement email thread.",
      paymentAvailable: "Your secure payment link is live and ready.",
      paymentAfterProposal: "Payment details will appear after proposal confirmation.",
      paymentUnavailable: "Payment link is being prepared and will be shared shortly.",
      onboardingAvailable: "Your onboarding brief is live and ready to complete.",
      onboardingAfterPayment: "Onboarding will appear after deposit confirmation.",
      onboardingCompleted: "Onboarding was submitted and confirmed.",
      onboardingUnavailable: "Onboarding link will appear here when sent.",
    },
    statusNames: {
      review: "Proposal review",
      ready: "Commitment",
      onboarding: "Kickoff setup",
      active: "In delivery",
      completed: "Completed",
    },
    statusDescriptions: {
      review: "We are aligning final details before work begins.",
      ready: "Your project is moving into confirmed kickoff.",
      onboarding: "We are preparing execution with your project inputs.",
      active: "Delivery is underway with active execution.",
      completed: "Delivery and handoff are complete.",
    },
    stepText: {
      review: "Review the proposal and confirm your decision when ready.",
      ready: "Your proposal is confirmed. The next step is deposit confirmation.",
      onboarding: "Kickoff inputs are being prepared so delivery can start smoothly.",
      active: "The team is currently delivering the agreed scope.",
      completed: "The project has been wrapped up and moved into post-delivery state.",
    },
    nextAction: {
      reviewProposalTitle: "Review your proposal",
      reviewProposalBody: "Open your proposal to review scope, timeline, and investment.",
      payDepositTitle: "Confirm your deposit",
      payDepositBody: "Use the secure payment link to confirm kickoff.",
      payDepositNoLinkBody: "Your payment link is being prepared. We will share it shortly.",
      onboardingTitle: "Complete onboarding",
      onboardingBody: "Submit the onboarding brief so delivery can begin without delays.",
      onboardingComingTitle: "Onboarding is next",
      onboardingComingBody: "No input is needed yet. We will share onboarding in the next step.",
      kickoffPrepTitle: "Kickoff preparation underway",
      kickoffPrepBody: "Your onboarding is complete. We are now preparing kickoff.",
      deliveryTitle: "Execution in progress",
      deliveryBody: "No action is needed right now while delivery is in progress.",
      completedTitle: "Project wrapped up",
      completedBody:
        "No further action is required unless you need support or a follow-up phase.",
    },
    paymentStateText: {
      proposalPhase: "Payment details will activate after proposal confirmation.",
      noPrice: "Commercial totals are being finalized.",
      unpaid: "Deposit is pending. Final payment remains pending.",
      depositPaid: "Deposit is confirmed. Final payment remains pending.",
      fullyPaid: "Deposit and final payment are both confirmed.",
    },
    summaryFallback:
      "Scope details are being finalized. This workspace updates as your project progresses.",
  },
  nl: {
    portalLabel: "Project Workspace",
    pageTitle: "Project Workspace",
    invalidMessage: "Deze workspacelink is ongeldig of niet meer beschikbaar.",
    invalidHelpPrefix: "Als dit niet klopt, neem contact op via",
    overviewLabel: "Overzicht",
    statusLabel: "Projectfase",
    currentStepLabel: "Huidige stap",
    nextActionLabel: "Volgende actie",
    docsLabel: "Belangrijke items",
    paymentLabel: "Betaling",
    summaryLabel: "Scope samenvatting",
    contactLabel: "Contact",
    projectStartLabel: "Geplande kickoff",
    depositRow: "Aanbetaling",
    finalRow: "Eindbetaling",
    pending: "Openstaand",
    paid: "Betaald",
    paidOnPrefix: "Bevestigd op",
    availableNow: "Beschikbaar",
    availableSoon: "Binnenkort",
    completedTag: "Afgerond",
    noActionTitle: "Er is nu geen actie nodig.",
    noActionBody: "We nemen contact op zodra jouw volgende input nodig is.",
    replyLine: "Reageer op je laatste Inovense-mail of neem contact op via",
    privateLine: (firstName, company) =>
      `Deze private workspace is bedoeld voor ${firstName} bij ${company}.`,
    docs: {
      proposalTitle: "Voorstel",
      contractTitle: "Contract",
      paymentTitle: "Betaling",
      onboardingTitle: "Onboarding",
      openProposal: "Open voorstel",
      openPayment: "Open betaling",
      openOnboarding: "Open onboarding",
      requestContract: "Vraag contractkopie aan",
      proposalAvailable:
        "Je voorstel staat hier klaar voor beoordeling en bevestiging.",
      proposalUnavailable: "Het voorstel verschijnt hier zodra het is gedeeld.",
      contractBody: "Contractdetails worden gedeeld in jullie overeenkomstmail.",
      paymentAvailable: "Je veilige betaallink staat live en is klaar voor gebruik.",
      paymentAfterProposal: "Betaalgegevens verschijnen na bevestiging van het voorstel.",
      paymentUnavailable: "Betaalgegevens verschijnen hier in de volgende stap.",
      onboardingAvailable: "Je onboarding staat live en kan direct worden ingevuld.",
      onboardingAfterPayment: "Onboarding verschijnt na bevestiging van de aanbetaling.",
      onboardingCompleted: "Onboarding is ingevuld en bevestigd.",
      onboardingUnavailable: "Onboarding wordt gedeeld zodra de delivery setup start.",
    },
    statusNames: {
      review: "Voorstel review",
      ready: "Bevestiging",
      onboarding: "Kickoff setup",
      active: "In delivery",
      completed: "Afgerond",
    },
    statusDescriptions: {
      review: "We stemmen de laatste details af voordat werk start.",
      ready: "Je project gaat nu richting bevestigde kickoff.",
      onboarding: "We bereiden de uitvoering voor met jouw projectinput.",
      active: "De uitvoering loopt met actieve oplevering.",
      completed: "Oplevering en handoff zijn afgerond.",
    },
    stepText: {
      review: "Bekijk het voorstel en bevestig je beslissing zodra je klaar bent.",
      ready: "Je voorstel is bevestigd. De volgende stap is aanbetaling bevestigen.",
      onboarding: "Kickoff-input wordt voorbereid zodat delivery soepel kan starten.",
      active: "Het team levert momenteel op binnen de afgesproken scope.",
      completed: "Het project is afgerond en staat nu in de post-delivery fase.",
    },
    nextAction: {
      reviewProposalTitle: "Bekijk je voorstel",
      reviewProposalBody: "Open je voorstel om scope, planning en investering te beoordelen.",
      payDepositTitle: "Bevestig je aanbetaling",
      payDepositBody: "Gebruik de veilige betaallink om de kickoff te bevestigen.",
      payDepositNoLinkBody: "Je betaallink wordt voorbereid. We delen deze snel met je.",
      onboardingTitle: "Vul onboarding in",
      onboardingBody: "Rond de onboarding af zodat delivery zonder vertraging kan starten.",
      onboardingComingTitle: "Onboarding is de volgende stap",
      onboardingComingBody: "Er is nu geen input nodig. We delen onboarding in de volgende stap.",
      kickoffPrepTitle: "Kickoff voorbereiding loopt",
      kickoffPrepBody: "Je onboarding is afgerond. We bereiden nu de kickoff voor.",
      deliveryTitle: "Uitvoering loopt",
      deliveryBody: "Er is nu geen actie nodig terwijl delivery loopt.",
      completedTitle: "Project afgerond",
      completedBody:
        "Er is geen verdere actie nodig tenzij je support of een vervolgfase wilt.",
    },
    paymentStateText: {
      proposalPhase: "Betaalgegevens worden actief na voorstelbevestiging.",
      noPrice: "Commerciele totalen worden nog afgerond.",
      unpaid: "Aanbetaling staat open. Eindbetaling staat ook nog open.",
      depositPaid: "Aanbetaling is bevestigd. Eindbetaling staat nog open.",
      fullyPaid: "Aanbetaling en eindbetaling zijn allebei bevestigd.",
    },
    summaryFallback:
      "Scopedetails worden afgerond. Deze workspace wordt bijgewerkt naarmate het project vordert.",
  },
};

function formatDate(iso: string, locale: ClientLocale) {
  return new Date(iso).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatLocalAmount(
  lead: Pick<PortalLead, "local_currency_code" | "lead_source">,
  value: number,
  locale: ClientLocale
) {
  const currencyCode = resolveClientFacingCurrencyCode({
    localCurrencyCode: lead.local_currency_code,
    leadSource: lead.lead_source,
  });
  return formatCurrencyAmount(value, currencyCode, locale === "nl" ? "nl-NL" : "en-GB");
}

function compactSummary(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 420) return compact;
  return `${compact.slice(0, 417)}...`;
}

async function getPortalLeadByToken(token: string): Promise<PortalLead | null> {
  const supabase = createSupabaseServerClient();
  const selectColumns =
    "id, full_name, company_name, work_email, lead_source, service_lane, project_type, project_details, status, project_status, onboarding_status, onboarding_token, onboarding_sent_at, onboarding_completed_at, proposal_token, proposal_status, proposal_title, proposal_intro, proposal_scope, proposal_price, proposal_deposit, proposal_decision, proposal_sent_at, payment_link, deposit_amount, deposit_paid_at, final_payment_paid_at, project_start_date, local_currency_code";

  const proposalResult = await supabase
    .from("leads")
    .select(selectColumns)
    .eq("proposal_token", token)
    .maybeSingle();

  if (proposalResult.error && proposalResult.error.code !== "PGRST116") {
    console.error("[client-portal] proposal token query error:", proposalResult.error);
    throw new Error(`Portal query failed: ${proposalResult.error.message}`);
  }

  if (proposalResult.data) {
    return proposalResult.data as PortalLead;
  }

  const onboardingResult = await supabase
    .from("leads")
    .select(selectColumns)
    .eq("onboarding_token", token)
    .maybeSingle();

  if (onboardingResult.error && onboardingResult.error.code !== "PGRST116") {
    console.error("[client-portal] onboarding token query error:", onboardingResult.error);
    throw new Error(`Portal query failed: ${onboardingResult.error.message}`);
  }

  return (onboardingResult.data as PortalLead | null) ?? null;
}

function derivePortalStatus(lead: PortalLead): PortalStatus {
  const phase = derivePortalPhase(lead);
  if (phase === "completed") return "completed";
  if (phase === "delivery") return "active";
  if (phase === "onboarding") return "onboarding";
  if (phase === "payment") return "ready";
  return "review";
}

function derivePortalPhase(lead: PortalLead): PortalPhase {
  if (lead.project_status === "completed" || lead.status === "won") {
    return "completed";
  }
  if (lead.project_status === "active" || lead.status === "active") {
    return "delivery";
  }
  if (lead.proposal_decision !== "accepted") {
    return "proposal";
  }
  if (!lead.deposit_paid_at) {
    return "payment";
  }
  return "onboarding";
}

type PortalNextAction = {
  title: string;
  body: string;
  href: string | null;
  ctaLabel: string | null;
  external: boolean;
};

function deriveNextAction(
  phase: PortalPhase,
  lead: PortalLead,
  copy: PortalCopy
): PortalNextAction {
  if (phase === "proposal") {
    return {
      title: copy.nextAction.reviewProposalTitle,
      body: copy.nextAction.reviewProposalBody,
      href: lead.proposal_token ? `/proposal/${lead.proposal_token}` : null,
      ctaLabel: lead.proposal_token ? copy.docs.openProposal : null,
      external: false,
    };
  }

  if (phase === "payment") {
    return {
      title: copy.nextAction.payDepositTitle,
      body: lead.payment_link ? copy.nextAction.payDepositBody : copy.nextAction.payDepositNoLinkBody,
      href: lead.payment_link,
      ctaLabel: lead.payment_link ? copy.docs.openPayment : null,
      external: true,
    };
  }

  if (phase === "onboarding") {
    if (lead.onboarding_status === "sent") {
      return {
        title: copy.nextAction.onboardingTitle,
        body: copy.nextAction.onboardingBody,
        href: lead.onboarding_token ? `/onboarding/${lead.onboarding_token}` : null,
        ctaLabel: lead.onboarding_token ? copy.docs.openOnboarding : null,
        external: false,
      };
    }

    if (lead.onboarding_status === "completed") {
      return {
        title: copy.nextAction.kickoffPrepTitle,
        body: copy.nextAction.kickoffPrepBody,
        href: null,
        ctaLabel: null,
        external: false,
      };
    }

    return {
      title: copy.nextAction.onboardingComingTitle,
      body: copy.nextAction.onboardingComingBody,
      href: null,
      ctaLabel: null,
      external: false,
    };
  }

  if (phase === "delivery") {
    return {
      title: copy.nextAction.deliveryTitle,
      body: copy.nextAction.deliveryBody,
      href: null,
      ctaLabel: null,
      external: false,
    };
  }

  if (phase === "completed") {
    return {
      title: copy.nextAction.completedTitle,
      body: copy.nextAction.completedBody,
      href: null,
      ctaLabel: null,
      external: false,
    };
  }

  return {
    title: copy.noActionTitle,
    body: copy.noActionBody,
    href: null,
    ctaLabel: null,
    external: false,
  };
}

function paymentSummaryText(
  phase: PortalPhase,
  lead: PortalLead,
  copy: PortalCopy
): string {
  if (phase === "proposal") return copy.paymentStateText.proposalPhase;

  const state = derivePaymentState(lead);
  if (state.kind === "no_price") return copy.paymentStateText.noPrice;
  if (state.kind === "unpaid") return copy.paymentStateText.unpaid;
  if (state.kind === "deposit_paid") return copy.paymentStateText.depositPaid;
  return copy.paymentStateText.fullyPaid;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const lead = await getPortalLeadByToken(token);
    const locale = getClientLocaleForLeadSource(lead?.lead_source);
    return {
      title: `${PORTAL_COPY[locale].pageTitle} | Inovense`,
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: "Project Workspace | Inovense",
      robots: { index: false, follow: false },
    };
  }
}

type DocumentTone = "default" | "active" | "upcoming";

function getDocumentCardClass(tone: DocumentTone): string {
  if (tone === "active") return "border-brand/35 bg-brand/10";
  if (tone === "upcoming") return "border-zinc-800/70 bg-zinc-950/35";
  return "border-zinc-800/80 bg-zinc-900/35";
}

function getDocumentTagClass(tone: DocumentTone): string {
  if (tone === "active") return "border-brand/35 bg-brand/10 text-brand";
  if (tone === "upcoming") return "border-zinc-800/70 bg-zinc-900/30 text-zinc-500";
  return "border-zinc-700/70 bg-zinc-900/35 text-zinc-500";
}

function DocumentCard({
  title,
  body,
  tag,
  tone = "default",
  ctaLabel,
  href,
  external = false,
}: {
  title: string;
  body: string;
  tag: string;
  tone?: DocumentTone;
  ctaLabel: string | null;
  href: string | null;
  external?: boolean;
}) {
  return (
    <article className={`rounded-xl border p-4 ${getDocumentCardClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
          {title}
        </p>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.11em] ${getDocumentTagClass(tone)}`}
        >
          {tag}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
      {ctaLabel && href ? (
        external ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:border-brand/60 hover:bg-brand/15"
          >
            {ctaLabel}
          </a>
        ) : (
          <Link
            href={href}
            className="mt-3 inline-flex items-center rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:border-brand/60 hover:bg-brand/15"
          >
            {ctaLabel}
          </Link>
        )
      ) : null}
    </article>
  );
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lead = await getPortalLeadByToken(token);
  const locale = getClientLocaleForLeadSource(lead?.lead_source);
  const copy = PORTAL_COPY[locale];

  if (!lead) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-sm text-zinc-500">{copy.invalidMessage}</p>
          <p className="mt-2 text-xs text-zinc-700">
            {copy.invalidHelpPrefix}{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
            >
              hello@inovense.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const firstName = lead.full_name.split(" ")[0] || lead.full_name;
  const portalStatus = derivePortalStatus(lead);
  const phase = derivePortalPhase(lead);
  const nextAction = deriveNextAction(phase, lead, copy);
  const paymentSummary = paymentSummaryText(phase, lead, copy);
  const proposalHref = lead.proposal_token ? `/proposal/${lead.proposal_token}` : null;
  const onboardingHref = lead.onboarding_token ? `/onboarding/${lead.onboarding_token}` : null;

  const scopeTextRaw =
    lead.proposal_scope ??
    lead.proposal_intro ??
    lead.proposal_title ??
    lead.project_details ??
    copy.summaryFallback;
  const scopeText = compactSummary(scopeTextRaw);

  const totalAmount = lead.proposal_price != null ? Number(lead.proposal_price) : null;
  const depositAmountRaw = lead.deposit_amount ?? lead.proposal_deposit;
  const depositAmount =
    depositAmountRaw != null ? Math.max(0, Number(depositAmountRaw)) : null;
  const totalDisplay =
    totalAmount != null && Number.isFinite(totalAmount)
      ? formatLocalAmount(lead, totalAmount, locale)
      : null;
  const depositDisplay =
    depositAmount != null && Number.isFinite(depositAmount)
      ? formatLocalAmount(lead, depositAmount, locale)
      : null;
  const showPaymentBreakdown = phase !== "proposal";

  const proposalTag = proposalHref ? copy.availableNow : copy.availableSoon;
  const proposalTone: DocumentTone =
    phase === "proposal" ? "active" : proposalHref ? "default" : "upcoming";
  const proposalBody = proposalHref
    ? copy.docs.proposalAvailable
    : copy.docs.proposalUnavailable;

  const paymentTag = lead.payment_link ? copy.availableNow : copy.availableSoon;
  const paymentTone: DocumentTone =
    phase === "payment" ? "active" : lead.payment_link ? "default" : "upcoming";
  const paymentBody = lead.payment_link
    ? copy.docs.paymentAvailable
    : phase === "proposal"
      ? copy.docs.paymentAfterProposal
      : copy.docs.paymentUnavailable;

  const onboardingTag =
    lead.onboarding_status === "completed"
      ? copy.completedTag
      : onboardingHref
        ? copy.availableNow
        : copy.availableSoon;
  const onboardingTone: DocumentTone =
    phase === "onboarding"
      ? "active"
      : lead.onboarding_status === "completed"
        ? "default"
        : onboardingHref
          ? "default"
          : "upcoming";
  const onboardingBody =
    lead.onboarding_status === "completed"
      ? copy.docs.onboardingCompleted
      : onboardingHref
        ? copy.docs.onboardingAvailable
        : phase === "proposal" || phase === "payment"
          ? copy.docs.onboardingAfterPayment
          : copy.docs.onboardingUnavailable;

  return (
    <div lang={locale} className="px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Inovense
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-brand">
            {copy.portalLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            {lead.company_name}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {copy.pageTitle} - {lead.service_lane}
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              {copy.statusLabel}
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
              {copy.statusNames[portalStatus]}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {copy.statusDescriptions[portalStatus]}
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5 lg:col-span-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              {copy.currentStepLabel}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              {copy.stepText[portalStatus]}
            </p>
            {lead.project_start_date ? (
              <p className="mt-2 text-xs text-zinc-600">
                {copy.projectStartLabel}: {formatDate(`${lead.project_start_date}T12:00:00`, locale)}
              </p>
            ) : null}
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article
            className={`rounded-2xl border p-5 ${
              nextAction.ctaLabel
                ? "border-brand/35 bg-brand/10"
                : "border-zinc-800/80 bg-zinc-900/35"
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              {copy.nextActionLabel}
            </p>
            <h2 className="mt-3 text-base font-semibold tracking-tight text-zinc-100">
              {nextAction.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{nextAction.body}</p>
            {nextAction.ctaLabel && nextAction.href ? (
              nextAction.external ? (
                <a
                  href={nextAction.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2 text-xs font-medium text-brand transition-colors hover:border-brand/60 hover:bg-brand/15"
                >
                  {nextAction.ctaLabel}
                </a>
              ) : (
                <Link
                  href={nextAction.href}
                  className="mt-4 inline-flex items-center rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2 text-xs font-medium text-brand transition-colors hover:border-brand/60 hover:bg-brand/15"
                >
                  {nextAction.ctaLabel}
                </Link>
              )
            ) : null}
          </article>

          <article
            className={`rounded-2xl border p-5 ${
              phase === "payment"
                ? "border-brand/35 bg-brand/10"
                : "border-zinc-800/80 bg-zinc-900/35"
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              {copy.paymentLabel}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{paymentSummary}</p>

            {showPaymentBreakdown ? (
              <>
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/70 bg-zinc-950/45 px-3 py-2">
                    <span className="text-xs text-zinc-500">{copy.depositRow}</span>
                    <span className="text-xs font-medium text-zinc-300">
                      {lead.deposit_paid_at ? copy.paid : copy.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/70 bg-zinc-950/45 px-3 py-2">
                    <span className="text-xs text-zinc-500">{copy.finalRow}</span>
                    <span className="text-xs font-medium text-zinc-300">
                      {lead.final_payment_paid_at ? copy.paid : copy.pending}
                    </span>
                  </div>
                </div>

                {(totalDisplay || depositDisplay) && (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {totalDisplay ? (
                      <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/45 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                          Total
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-200">{totalDisplay}</p>
                      </div>
                    ) : null}
                    {depositDisplay ? (
                      <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/45 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                          {copy.depositRow}
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-200">{depositDisplay}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {lead.deposit_paid_at ? (
                  <p className="mt-3 text-[11px] text-zinc-600">
                    {copy.paidOnPrefix} {formatDate(lead.deposit_paid_at, locale)}
                  </p>
                ) : null}
              </>
            ) : null}
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5 sm:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
            {copy.docsLabel}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DocumentCard
              title={copy.docs.proposalTitle}
              body={proposalBody}
              tag={proposalTag}
              tone={proposalTone}
              ctaLabel={proposalHref ? copy.docs.openProposal : null}
              href={proposalHref}
            />
            <DocumentCard
              title={copy.docs.paymentTitle}
              body={paymentBody}
              tag={paymentTag}
              tone={paymentTone}
              ctaLabel={lead.payment_link ? copy.docs.openPayment : null}
              href={lead.payment_link}
              external
            />
            <DocumentCard
              title={copy.docs.onboardingTitle}
              body={onboardingBody}
              tag={onboardingTag}
              tone={onboardingTone}
              ctaLabel={
                onboardingHref && lead.onboarding_status !== "completed"
                  ? copy.docs.openOnboarding
                  : null
              }
              href={onboardingHref}
            />
            <DocumentCard
              title={copy.docs.contractTitle}
              body={copy.docs.contractBody}
              tag={copy.availableSoon}
              tone="upcoming"
              ctaLabel={copy.docs.requestContract}
              href={`mailto:hello@inovense.com?subject=${encodeURIComponent(`Contract copy - ${lead.company_name}`)}`}
              external
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5 lg:col-span-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              {copy.summaryLabel}
            </p>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-zinc-100">
              {lead.proposal_title ?? `${lead.service_lane} engagement`}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{scopeText}</p>
          </article>

          <article className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              {copy.contactLabel}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {copy.replyLine}{" "}
              <a
                href={`mailto:hello@inovense.com?subject=${encodeURIComponent(`Project update - ${lead.company_name}`)}`}
                className="text-zinc-300 underline underline-offset-2 hover:text-zinc-100"
              >
                hello@inovense.com
              </a>
              .
            </p>
            <p className="mt-2 text-xs text-zinc-700">{lead.work_email}</p>
          </article>
        </section>

        <footer className="border-t border-zinc-800/60 pt-5">
          <p className="text-xs text-zinc-700">{copy.privateLine(firstName, lead.company_name)}</p>
        </footer>
      </div>
    </div>
  );
}

