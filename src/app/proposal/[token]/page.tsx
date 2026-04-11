import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClientLocaleForLeadSource, type ClientLocale } from "@/lib/client-locale";
import { acceptProposal, declineProposal } from "./actions";
import { formatCurrencyAmount, normalizeCurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

type ProposalLead = {
  id: string;
  full_name: string;
  company_name: string;
  service_lane: string;
  lead_source: string | null;
  proposal_status: string | null;
  proposal_title: string | null;
  proposal_intro: string | null;
  proposal_scope: string | null;
  proposal_deliverables: string | null;
  proposal_timeline: string | null;
  proposal_price: number | null;
  proposal_deposit: number | null;
  local_currency_code: string | null;
  proposal_decision: "accepted" | "declined" | null;
  proposal_decided_at: string | null;
  proposal_sent_at: string | null;
};

type ProposalCopy = {
  proposalLabel: string;
  invalidLinkMessage: string;
  invalidLinkHelp: string;
  draftMessage: string;
  preparedPrefix: string;
  priceLabel: string;
  depositLabel: string;
  notSet: string;
  depositShareSuffix: string;
  contentPreparing: string;
  decisionLabel: string;
  acceptedTitle: string;
  acceptedMessage: string;
  declinedTitle: string;
  declinedMessage: string;
  recordedPrefix: string;
  decisionPrompt: string;
  acceptButton: string;
  declineButton: string;
  questionsLinePrefix: string;
  privateNote: (firstName: string, company: string) => string;
};

const PROPOSAL_COPY: Record<ClientLocale, ProposalCopy> = {
  en: {
    proposalLabel: "Proposal",
    invalidLinkMessage: "This proposal link is invalid or no longer available.",
    invalidLinkHelp: "If you believe this is a mistake, contact us at",
    draftMessage: "Your proposal is being prepared. We will be in touch shortly.",
    preparedPrefix: "Prepared",
    priceLabel: "Proposal price",
    depositLabel: "Deposit to start",
    notSet: "Not set",
    depositShareSuffix: "of total proposal.",
    contentPreparing: "Proposal content is being prepared. Check back shortly.",
    decisionLabel: "Decision",
    acceptedTitle: "Proposal accepted",
    acceptedMessage:
      "Thank you. We have recorded your acceptance and the team will continue with next steps.",
    declinedTitle: "Proposal declined",
    declinedMessage:
      "We have recorded your decision. If context changes later, you can reply to our email and we can revisit scope together.",
    recordedPrefix: "Recorded",
    decisionPrompt: "If everything looks right, confirm your decision below.",
    acceptButton: "Accept proposal",
    declineButton: "Decline proposal",
    questionsLinePrefix: "Questions? Reply to our email or reach out at",
    privateNote: (firstName, company) =>
      `This proposal is private and intended only for ${firstName} at ${company}.`,
  },
  nl: {
    proposalLabel: "Voorstel",
    invalidLinkMessage: "Deze voorstellink is ongeldig of niet meer beschikbaar.",
    invalidLinkHelp: "Als je denkt dat dit een fout is, neem contact op via",
    draftMessage: "Je voorstel wordt voorbereid. We nemen snel contact met je op.",
    preparedPrefix: "Opgesteld",
    priceLabel: "Voorstelprijs",
    depositLabel: "Aanbetaling om te starten",
    notSet: "Niet ingesteld",
    depositShareSuffix: "van het totale voorstel.",
    contentPreparing: "De voorstelinhoud wordt voorbereid. Probeer het binnenkort opnieuw.",
    decisionLabel: "Beslissing",
    acceptedTitle: "Voorstel geaccepteerd",
    acceptedMessage:
      "Dankjewel. We hebben je akkoord geregistreerd en het team gaat door met de volgende stappen.",
    declinedTitle: "Voorstel afgewezen",
    declinedMessage:
      "We hebben je beslissing geregistreerd. Als de context later verandert, kun je op onze e-mail reageren en de scope opnieuw bespreken.",
    recordedPrefix: "Geregistreerd",
    decisionPrompt: "Als alles klopt, bevestig hieronder je beslissing.",
    acceptButton: "Voorstel accepteren",
    declineButton: "Voorstel afwijzen",
    questionsLinePrefix: "Vragen? Antwoord op onze e-mail of neem contact op via",
    privateNote: (firstName, company) =>
      `Dit voorstel is privé en alleen bedoeld voor ${firstName} bij ${company}.`,
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
  value: number,
  currencyCode: string | null | undefined,
  locale: ClientLocale
) {
  return formatCurrencyAmount(
    value,
    normalizeCurrencyCode(currencyCode),
    locale === "nl" ? "nl-NL" : "en-GB"
  );
}

async function getProposalLeadByToken(token: string): Promise<ProposalLead | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, full_name, company_name, service_lane, lead_source, proposal_status, proposal_title, proposal_intro, proposal_scope, proposal_deliverables, proposal_timeline, proposal_price, proposal_deposit, local_currency_code, proposal_decision, proposal_decided_at, proposal_sent_at"
    )
    .eq("proposal_token", token)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[proposal] query error:", error);
    throw new Error(`Proposal query failed: ${error.message}`);
  }

  return (data as ProposalLead | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const lead = await getProposalLeadByToken(token);
    const locale = getClientLocaleForLeadSource(lead?.lead_source);
    return {
      title: `${PROPOSAL_COPY[locale].proposalLabel} | Inovense`,
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: "Proposal | Inovense",
      robots: { index: false, follow: false },
    };
  }
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lead = await getProposalLeadByToken(token);
  const locale = getClientLocaleForLeadSource(lead?.lead_source);
  const copy = PROPOSAL_COPY[locale];

  const proposalBlocks = lead
    ? [lead.proposal_intro, lead.proposal_scope, lead.proposal_deliverables, lead.proposal_timeline]
        .filter((block): block is string => typeof block === "string" && block.trim().length > 0)
    : [];
  const hasProposalContent = proposalBlocks.length > 0;

  if (!lead || lead.proposal_status === "archived") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-sm text-zinc-600">{copy.invalidLinkMessage}</p>
          <p className="mt-2 text-xs text-zinc-700">
            {copy.invalidLinkHelp}{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              hello@inovense.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (lead.proposal_status === "draft" && !hasProposalContent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-brand">
            {copy.proposalLabel}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            {lead.company_name}
          </h1>
          <p className="mt-4 text-sm text-zinc-500">{copy.draftMessage}</p>
          <p className="mt-3 text-xs text-zinc-700">
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              hello@inovense.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  const firstName = lead.full_name.split(" ")[0];
  const hasPrice = lead.proposal_price != null;
  const hasDeposit = lead.proposal_deposit != null;
  const depositShare =
    hasPrice &&
    hasDeposit &&
    Number(lead.proposal_price) > 0
      ? Math.min(
          100,
          Math.max(0, (Number(lead.proposal_deposit) / Number(lead.proposal_price)) * 100)
        )
      : null;
  const proposalDecision = lead.proposal_decision;
  const acceptAction = acceptProposal.bind(null, token);
  const declineAction = declineProposal.bind(null, token);

  return (
    <div className="px-4 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-2xl">

        <div className="mb-12">
          <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            Inovense
          </p>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-brand">
            {copy.proposalLabel}
          </p>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-3xl">
            {lead.proposal_title ?? lead.company_name}
          </h1>
          {lead.proposal_sent_at ? (
            <p className="mt-2 text-sm text-zinc-600">
              {copy.preparedPrefix} {formatDate(lead.proposal_sent_at, locale)}
            </p>
          ) : null}
        </div>

        {(hasPrice || hasDeposit) ? (
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                {copy.priceLabel}
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100">
                {hasPrice
                  ? formatLocalAmount(
                      Number(lead.proposal_price),
                      lead.local_currency_code,
                      locale
                    )
                  : copy.notSet}
              </p>
            </div>
            <div className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-brand/70">
                {copy.depositLabel}
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100">
                {hasDeposit
                  ? formatLocalAmount(
                      Number(lead.proposal_deposit),
                      lead.local_currency_code,
                      locale
                    )
                  : copy.notSet}
              </p>
              {depositShare != null ? (
                <p className="mt-1.5 text-[11px] text-brand/70">
                  {depositShare.toFixed(1)}% {copy.depositShareSuffix}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mb-10 h-px bg-zinc-800/60" />

        {hasProposalContent ? (
          <div className="space-y-5">
            {proposalBlocks.map((block, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-zinc-400 sm:text-base"
              >
                {block.trim()}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">{copy.contentPreparing}</p>
        )}

        <div className="mt-14 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 sm:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
            {copy.decisionLabel}
          </p>

          {proposalDecision === "accepted" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-emerald-400">
                {copy.acceptedTitle}
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                {copy.acceptedMessage}
              </p>
              {lead.proposal_decided_at ? (
                <p className="text-[11px] text-zinc-700">
                  {copy.recordedPrefix} {formatDate(lead.proposal_decided_at, locale)}
                </p>
              ) : null}
            </div>
          ) : proposalDecision === "declined" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-zinc-400">
                {copy.declinedTitle}
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                {copy.declinedMessage}
              </p>
              {lead.proposal_decided_at ? (
                <p className="text-[11px] text-zinc-700">
                  {copy.recordedPrefix} {formatDate(lead.proposal_decided_at, locale)}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-3">
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                {copy.decisionPrompt}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <form action={acceptAction} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
                  >
                    {copy.acceptButton}
                  </button>
                </form>
                <form action={declineAction} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/70 hover:text-zinc-200"
                  >
                    {copy.declineButton}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="mt-16 border-t border-zinc-800/60 pt-8">
          <p className="text-xs text-zinc-700">
            {copy.questionsLinePrefix}{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              hello@inovense.com
            </a>
            .
          </p>
          <p className="mt-2 text-xs text-zinc-800">
            {copy.privateNote(firstName, lead.company_name)}
          </p>
        </div>

      </div>
    </div>
  );
}
