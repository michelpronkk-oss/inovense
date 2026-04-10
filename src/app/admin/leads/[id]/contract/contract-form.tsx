"use client";

import { useState, useTransition } from "react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type ContractType = "project" | "retainer" | "collaboration";

interface ContractFormProps {
  leadId: string;
  clientName: string;
  companyName: string;
  clientEmail: string;
  serviceLane: string;
  initialTitle: string;
  initialStartDate: string;
  initialScope: string;
  initialTotalValue: string;
  initialDeposit: string;
}

/* ─── Contract type cards ───────────────────────────────────────────────── */

const CONTRACT_TYPES: {
  value: ContractType;
  label: string;
  description: string;
}[] = [
  {
    value: "project",
    label: "Project Agreement",
    description: "One-time engagement with defined scope, deliverables, and a clear end point.",
  },
  {
    value: "retainer",
    label: "Retainer Agreement",
    description: "Ongoing monthly engagement with recurring services and billing.",
  },
  {
    value: "collaboration",
    label: "Collaboration Agreement",
    description: "Partner or collaboration arrangement between two parties.",
  },
];

/* ─── Shared input styles ───────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-brand/50 focus:ring-0";
const labelCls =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500";

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ContractForm({
  leadId,
  clientName,
  companyName,
  clientEmail,
  serviceLane,
  initialTitle,
  initialStartDate,
  initialScope,
  initialTotalValue,
  initialDeposit,
}: ContractFormProps) {
  const [contractType, setContractType] = useState<ContractType>("project");
  const [engagementTitle, setEngagementTitle] = useState(initialTitle);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [scopeSummary, setScopeSummary] = useState(initialScope);
  const [totalValue, setTotalValue] = useState(initialTotalValue);
  const [depositAmount, setDepositAmount] = useState(initialDeposit);
  const [paymentTerms, setPaymentTerms] = useState("7 days from invoice");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(initialStartDate);

  const [generating, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          contractType,
          clientName,
          companyName,
          clientEmail,
          serviceLane,
          engagementTitle,
          startDate,
          scopeSummary,
          totalValue,
          depositAmount,
          paymentTerms,
          additionalNotes,
          effectiveDate,
        };

        const res = await fetch(
          `/admin/leads/${leadId}/contract/download`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) throw new Error("PDF generation failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        a.href = url;
        a.download = `inovense-contract-${slug}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-8">

      {/* Contract type */}
      <div>
        <p className={labelCls}>Contract type</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CONTRACT_TYPES.map((ct) => {
            const active = contractType === ct.value;
            return (
              <button
                key={ct.value}
                type="button"
                onClick={() => setContractType(ct.value)}
                className={[
                  "relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200",
                  active
                    ? "border-brand/50 bg-brand/8"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80",
                ].join(" ")}
              >
                {active && (
                  <div className="absolute inset-x-0 top-0 h-px bg-brand/60" />
                )}
                <p
                  className={[
                    "mb-1 text-sm font-semibold leading-snug",
                    active ? "text-brand" : "text-zinc-200",
                  ].join(" ")}
                >
                  {ct.label}
                </p>
                <p className="text-xs leading-relaxed text-zinc-600">
                  {ct.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Client summary (read-only) */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
          Client details (from CRM)
        </p>
        <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
          {[
            { label: "Name", value: clientName },
            { label: "Company", value: companyName },
            { label: "Email", value: clientEmail },
            { label: "Lane", value: serviceLane },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-700">
                {label}
              </p>
              <p className="text-sm text-zinc-400">{value || "Not set"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Engagement title</label>
          <input
            className={inputCls}
            value={engagementTitle}
            onChange={(e) => setEngagementTitle(e.target.value)}
            placeholder="e.g. Website build, Monthly content retainer"
          />
        </div>
        <div>
          <label className={labelCls}>Start date</label>
          <input
            type="date"
            className={inputCls}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      {/* Scope */}
      <div>
        <label className={labelCls}>Scope summary</label>
        <textarea
          className={`${inputCls} min-h-[120px] resize-y`}
          value={scopeSummary}
          onChange={(e) => setScopeSummary(e.target.value)}
          placeholder="Describe the scope of work, deliverables, and key inclusions."
          rows={6}
        />
        <p className="mt-1.5 text-[11px] text-zinc-700">
          Edit to match what was agreed. Keep it clear and specific.
        </p>
      </div>

      {/* Commercial */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Total value</label>
          <input
            className={inputCls}
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
            placeholder="e.g. EUR 2,500"
          />
        </div>
        <div>
          <label className={labelCls}>Deposit</label>
          <input
            className={inputCls}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="e.g. EUR 1,000"
          />
        </div>
        <div>
          <label className={labelCls}>Payment terms</label>
          <input
            className={inputCls}
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. 7 days from invoice"
          />
        </div>
      </div>

      {/* Additional notes */}
      <div>
        <label className={labelCls}>Additional notes</label>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any specific terms, amendments, or notes to include."
          rows={3}
        />
      </div>

      {/* Effective date */}
      <div className="sm:w-48">
        <label className={labelCls}>Effective date</label>
        <input
          type="date"
          className={inputCls}
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-zinc-700">
          Date shown at the top of the document.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4 border-t border-zinc-800/60 pt-6">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2.5 rounded-full bg-brand px-8 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60"
        >
          {generating ? (
            <>
              <svg
                className="h-3.5 w-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M7 1v8M4 6l3 3 3-3M2 11h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate PDF
            </>
          )}
        </button>
        <p className="text-xs text-zinc-600">
          Downloads as a PDF. Review before sending to the client.
        </p>
      </div>
    </div>
  );
}
