import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatCurrencyAmount, normalizeCurrencyCode } from "@/lib/currency";
import { ContractForm } from "./contract-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("leads")
      .select("full_name, company_name")
      .eq("id", id)
      .single();
    if (data) {
      return {
        title: `Contract: ${data.company_name} | Inovense CRM`,
      };
    }
  } catch {}
  return { title: "Generate Contract | Inovense CRM" };
}

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createSupabaseServerClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) return notFound();

  // Pre-fill from CRM data
  const initialScope =
    lead.proposal_scope ||
    lead.proposal_deliverables ||
    lead.project_details ||
    "";
  const initialTitle = lead.proposal_title || lead.project_type || "";

  const rawStartDate = lead.project_start_date
    ? lead.project_start_date
    : new Date().toISOString().split("T")[0];
  const initialStartDate = rawStartDate;

  const localCurrencyCode = normalizeCurrencyCode(lead.local_currency_code);
  const amountLocale = localCurrencyCode === "USD" ? "en-US" : "en-GB";
  const formatAmount = (val: number | null) =>
    val != null
      ? formatCurrencyAmount(val, localCurrencyCode, amountLocale)
      : "";

  const initialTotalValue = formatAmount(lead.proposal_price);
  const initialDeposit = formatAmount(
    lead.deposit_amount ?? lead.proposal_deposit
  );

  return (
    <>
      {/* Back nav */}
      <div className="mb-8">
        <Link
          href={`/admin/leads/${id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to {lead.company_name}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">
              Generate contract
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {lead.full_name} &middot; {lead.company_name}
            </p>
          </div>
          <span className="rounded-full border border-zinc-700/50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
            PDF only
          </span>
        </div>
      </div>

      {/* Form container */}
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6 md:p-8">
          <ContractForm
            leadId={id}
            clientName={lead.full_name}
            companyName={lead.company_name}
            clientEmail={lead.work_email}
            serviceLane={lead.service_lane}
            initialTitle={initialTitle}
            initialStartDate={initialStartDate}
            initialScope={initialScope.slice(0, 1200)}
            initialTotalValue={initialTotalValue}
            initialDeposit={initialDeposit}
            initialCurrencyCode={localCurrencyCode}
          />
        </div>

        <p className="mt-4 text-center text-xs text-zinc-700">
          Review all fields before generating. The PDF downloads immediately.
        </p>
      </div>
    </>
  );
}
