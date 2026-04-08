import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { acceptProposal, declineProposal } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposal | Inovense",
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEuro(value: number) {
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let lead: {
    id: string;
    full_name: string;
    company_name: string;
    service_lane: string;
    proposal_body: string | null;
    proposal_price: number | null;
    proposal_deposit: number | null;
    proposal_decision: "accepted" | "declined" | null;
    proposal_decided_at: string | null;
    proposal_sent_at: string | null;
  } | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("leads")
      .select(
        "id, full_name, company_name, service_lane, proposal_body, proposal_price, proposal_deposit, proposal_decision, proposal_decided_at, proposal_sent_at"
      )
      .eq("proposal_token", token)
      .single();

    lead = data ?? null;
  } catch {
    lead = null;
  }

  if (!lead) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-sm text-zinc-600">
            This proposal link is invalid or has expired.
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            If you believe this is a mistake, contact us at{" "}
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

        {/* Header */}
        <div className="mb-12">
          <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            Inovense
          </p>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-brand">
            Proposal
          </p>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-3xl">
            {lead.company_name}
          </h1>
          {lead.proposal_sent_at && (
            <p className="mt-2 text-sm text-zinc-600">
              Prepared {formatDate(lead.proposal_sent_at)}
            </p>
          )}
        </div>

        {(hasPrice || hasDeposit) && (
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                Proposal price
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100">
                {hasPrice ? formatEuro(Number(lead.proposal_price)) : "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-brand/70">
                Deposit to start
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100">
                {hasDeposit
                  ? formatEuro(Number(lead.proposal_deposit))
                  : "Not set"}
              </p>
              {depositShare != null && (
                <p className="mt-1.5 text-[11px] text-brand/70">
                  {depositShare.toFixed(1)}% of total proposal.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mb-10 h-px bg-zinc-800/60" />

        {/* Proposal content */}
        {lead.proposal_body ? (
          <div className="space-y-5">
            {lead.proposal_body
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-zinc-400 sm:text-base"
                >
                  {paragraph.trim()}
                </p>
              ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Proposal content is being prepared. Check back shortly.
          </p>
        )}

        {/* Decision actions */}
        <div className="mt-14 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 sm:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
            Decision
          </p>

          {proposalDecision === "accepted" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-emerald-400">
                Proposal accepted
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                Thank you. We have recorded your acceptance and the team will
                continue with next steps.
              </p>
              {lead.proposal_decided_at && (
                <p className="text-[11px] text-zinc-700">
                  Recorded {formatDate(lead.proposal_decided_at)}
                </p>
              )}
            </div>
          ) : proposalDecision === "declined" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-zinc-400">
                Proposal declined
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                We have recorded your decision. If context changes later, you
                can reply to our email and we can revisit scope together.
              </p>
              {lead.proposal_decided_at && (
                <p className="text-[11px] text-zinc-700">
                  Recorded {formatDate(lead.proposal_decided_at)}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                If everything looks right, confirm your decision below.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <form action={acceptAction} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
                  >
                    Accept proposal
                  </button>
                </form>
                <form action={declineAction} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/70 hover:text-zinc-200"
                  >
                    Decline proposal
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-zinc-800/60 pt-8">
          <p className="text-xs text-zinc-700">
            Questions? Reply to the email from us or reach out at{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              hello@inovense.com
            </a>
            .
          </p>
          <p className="mt-2 text-xs text-zinc-800">
            This proposal is private and intended only for {firstName} at {lead.company_name}.
          </p>
        </div>

      </div>
    </div>
  );
}
