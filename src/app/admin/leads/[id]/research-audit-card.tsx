"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerLeadResearch } from "./research-actions";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";
import { format } from "date-fns";

/* ─── Small primitives ───────────────────────────────────────────────────── */

function AuditRow({
  label,
  items,
  accent = false,
}: {
  label: string;
  items: string[];
  accent?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex gap-2 text-xs leading-relaxed ${accent ? "text-zinc-300" : "text-zinc-400"}`}
          >
            <span className="mt-[3px] shrink-0 text-zinc-700">&mdash;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NullField({ label }: { label: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
        {label}
      </p>
      <p className="text-xs text-zinc-700 italic">No data</p>
    </div>
  );
}

function SnapshotField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return <NullField label={label} />;
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
        {label}
      </p>
      <p className="text-xs leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

/* ─── Audit display ──────────────────────────────────────────────────────── */

function AuditDisplay({ audit }: { audit: LeadResearchOutput }) {
  const [section, setSection] = useState<"overview" | "audit" | "angle">(
    "overview"
  );
  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "audit" as const, label: "Commercial" },
    { key: "angle" as const, label: "Angles" },
  ];

  return (
    <div className="space-y-4">
      {/* Header meta */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-brand">
            {audit.output_language === "nl" ? "NL" : "EN"}
          </span>
          {audit.run_warnings.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-0.5 text-[10px] font-medium text-amber-500/80">
              {audit.run_warnings.length} warning
              {audit.run_warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-[10px] tabular-nums text-zinc-700">
          {format(new Date(audit.generated_at), "MMM d, yyyy, HH:mm")}
        </span>
      </div>

      {/* Executive summary */}
      <p className="text-xs leading-relaxed text-zinc-300">
        {audit.executive_summary}
      </p>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
              section === t.key
                ? "bg-zinc-700/60 text-zinc-200"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === "overview" && (
        <div className="space-y-3">
          <SnapshotField
            label="What they sell"
            value={audit.company_snapshot.what_the_company_sells}
          />
          <SnapshotField
            label="Target customer"
            value={audit.company_snapshot.likely_target_customer}
          />
          <SnapshotField
            label="Business model"
            value={audit.company_snapshot.business_model_guess}
          />
          <SnapshotField
            label="Market / geo"
            value={audit.company_snapshot.market_geo_signal}
          />
          {audit.run_warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-amber-600">
                Warnings
              </p>
              <ul className="space-y-1">
                {audit.run_warnings.map((w, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-amber-600/70">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {section === "audit" && (
        <div className="space-y-4">
          <AuditRow
            label="Strengths"
            items={audit.commercial_audit.strengths}
            accent
          />
          <AuditRow
            label="Trust signals"
            items={audit.commercial_audit.trust_signals}
          />
          <AuditRow
            label="Gaps"
            items={audit.commercial_audit.gaps}
          />
          <AuditRow
            label="Conversion friction"
            items={audit.commercial_audit.conversion_friction}
          />
          <AuditRow
            label="Risks"
            items={audit.commercial_audit.risks}
          />
        </div>
      )}

      {section === "angle" && (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Suggested lane fit
            </p>
            <div className="flex flex-wrap gap-1.5">
              {audit.proposal_angle_inputs.suggested_lane_fit.map((lane) => (
                <span
                  key={lane}
                  className="inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-2.5 py-0.5 text-[11px] font-medium text-brand"
                >
                  {lane}
                </span>
              ))}
            </div>
          </div>
          <AuditRow
            label="Likely priorities"
            items={audit.proposal_angle_inputs.likely_priorities}
            accent
          />
          <AuditRow
            label="Likely objections"
            items={audit.proposal_angle_inputs.likely_objections}
          />
          <AuditRow
            label="Angle seeds"
            items={audit.proposal_angle_inputs.angle_seeds}
          />
        </div>
      )}

      {/* Sources footer */}
      {audit.sources.length > 0 && audit.sources[0].url && (
        <div className="border-t border-zinc-800/40 pt-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-700">
            Source
          </p>
          <a
            href={audit.sources[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
          >
            {audit.sources[0].url}
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────────── */

export function ResearchAuditCard({
  leadId,
  initialAudit,
}: {
  leadId: string;
  initialAudit: LeadResearchOutput | null;
  auditAt?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localAudit, setLocalAudit] = useState<LeadResearchOutput | null>(
    initialAudit
  );

  function handleRun() {
    setError(null);
    startTransition(async () => {
      const result = await triggerLeadResearch(leadId);
      if (result.ok) {
        setLocalAudit(result.output);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const hasAudit = localAudit !== null;

  return (
    <div className="space-y-4">
      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/40 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
      >
        {isPending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
            Running analysis...
          </>
        ) : hasAudit ? (
          "Re-run analysis"
        ) : (
          "Run lead research"
        )}
      </button>

      {!hasAudit && !isPending && (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Fetches website content and runs a commercial audit via AI. Internal
          only. Does not change lead status or write proposal fields.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {localAudit && <AuditDisplay audit={localAudit} />}
    </div>
  );
}
