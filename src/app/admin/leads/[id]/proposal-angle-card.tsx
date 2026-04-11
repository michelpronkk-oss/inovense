"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  triggerProposalAngle,
  applyProposalAngleToProposalFields,
} from "./proposal-angle-actions";
import type { ProposalAngleOutput } from "@/lib/agents/proposal-angle/schema";
import { format } from "date-fns";

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function FramingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
        {label}
      </p>
      <p className="text-xs leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

function PrefillField({
  label,
  value,
  internal,
}: {
  label: string;
  value: string | null;
  internal?: boolean;
}) {
  if (!value) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          {label}
        </p>
        <p className="text-xs italic text-zinc-700">Empty</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          {label}
        </p>
        {internal && (
          <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-700">
            internal
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
        {value}
      </p>
    </div>
  );
}

/* ─── Output display ─────────────────────────────────────────────────────── */

function AngleDisplay({
  angle,
  leadId,
  appliedAt,
}: {
  angle: ProposalAngleOutput;
  leadId: string;
  appliedAt: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"framing" | "prefill" | "notes">("framing");
  const [applyPending, startApplyTransition] = useTransition();
  const [applyError, setApplyError] = useState<string | null>(null);
  const [localAppliedAt, setLocalAppliedAt] = useState<string | null>(appliedAt);
  const [confirmApply, setConfirmApply] = useState(false);

  const tabs = [
    { key: "framing" as const, label: "Framing" },
    { key: "prefill" as const, label: "Prefill" },
    { key: "notes" as const, label: "Notes" },
  ];

  function handleApply() {
    if (!confirmApply) {
      setConfirmApply(true);
      return;
    }
    setApplyError(null);
    setConfirmApply(false);
    startApplyTransition(async () => {
      const result = await applyProposalAngleToProposalFields(leadId);
      if (result.ok) {
        setLocalAppliedAt(new Date().toISOString());
        router.refresh();
      } else {
        setApplyError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-brand">
            {angle.output_language === "nl" ? "NL" : "EN"}
          </span>
          {angle.run_warnings.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-0.5 text-[10px] font-medium text-amber-500/80">
              {angle.run_warnings.length} warning
              {angle.run_warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-[10px] tabular-nums text-zinc-700">
          {format(new Date(angle.generated_at), "MMM d, yyyy, HH:mm")}
        </span>
      </div>

      {/* Angle title */}
      <p className="text-xs font-medium text-zinc-200">
        {angle.proposal_angle_title}
      </p>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
              tab === t.key
                ? "bg-zinc-700/60 text-zinc-200"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Framing */}
      {tab === "framing" && (
        <div className="space-y-4">
          <FramingField
            label="Current situation"
            value={angle.current_situation}
          />
          <FramingField
            label="What is likely holding growth back"
            value={angle.what_is_likely_holding_growth_back}
          />
          <FramingField
            label="Recommended scope"
            value={angle.recommended_scope}
          />
          <FramingField
            label="Expected outcome"
            value={angle.expected_outcome}
          />
          <FramingField label="Why now" value={angle.why_now} />
          {angle.optional_email_intro_paragraph && (
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Email intro (optional)
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                {angle.optional_email_intro_paragraph}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prefill */}
      {tab === "prefill" && (
        <div className="space-y-4">
          <PrefillField
            label="Proposal title"
            value={angle.proposal_prefill.proposal_title}
          />
          <PrefillField
            label="Intro"
            value={angle.proposal_prefill.proposal_intro}
          />
          <PrefillField
            label="Scope"
            value={angle.proposal_prefill.proposal_scope}
          />
          <PrefillField
            label="Deliverables"
            value={angle.proposal_prefill.proposal_deliverables}
          />
          <PrefillField
            label="Timeline"
            value={angle.proposal_prefill.proposal_timeline}
          />
          <PrefillField
            label="Internal notes"
            value={angle.proposal_prefill.proposal_notes}
            internal
          />

          {/* Apply */}
          <div className="border-t border-zinc-800/40 pt-3 space-y-2">
            {localAppliedAt && !confirmApply && (
              <p className="text-[10px] text-zinc-700">
                Last applied{" "}
                {format(new Date(localAppliedAt), "MMM d, yyyy, HH:mm")}
              </p>
            )}

            {confirmApply ? (
              <div className="space-y-2">
                <p className="text-[11px] text-amber-500/80">
                  This will overwrite proposal_title, intro, scope,
                  deliverables, timeline, and notes. Continue?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApply}
                    disabled={applyPending}
                    className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] font-medium text-brand transition-colors hover:bg-brand/15 disabled:cursor-wait disabled:opacity-50"
                  >
                    {applyPending ? "Applying..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmApply(false)}
                    className="rounded-lg border border-zinc-700/60 px-3 py-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applyPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/40 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
              >
                {localAppliedAt
                  ? "Re-apply to proposal fields"
                  : "Apply to proposal fields"}
              </button>
            )}

            {applyError && (
              <p className="text-[11px] text-red-400">{applyError}</p>
            )}
            <p className="text-[10px] leading-relaxed text-zinc-700">
              Writes prefill into proposal_title, intro, scope, deliverables,
              timeline, and notes. Does not change price, deposit, or lead
              status.
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      {tab === "notes" && (
        <div className="space-y-4">
          {angle.internal_notes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Internal notes
              </p>
              <ul className="space-y-1">
                {angle.internal_notes.map((note, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs leading-relaxed text-zinc-400"
                  >
                    <span className="mt-[3px] shrink-0 text-zinc-700">
                      &mdash;
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {angle.run_warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-amber-600">
                Warnings
              </p>
              <ul className="space-y-1">
                {angle.run_warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-[11px] leading-relaxed text-amber-600/70"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {angle.optional_intro_paragraph && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Optional intro paragraph
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                {angle.optional_intro_paragraph}
              </p>
            </div>
          )}
          <div className="text-[10px] text-zinc-700 space-y-0.5">
            <p>Language: {angle.output_language.toUpperCase()} ({angle.language_reason})</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────────── */

export function ProposalAngleCard({
  leadId,
  hasResearchAudit,
  initialAngle,
  appliedAt,
}: {
  leadId: string;
  hasResearchAudit: boolean;
  initialAngle: ProposalAngleOutput | null;
  appliedAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localAngle, setLocalAngle] = useState<ProposalAngleOutput | null>(
    initialAngle
  );

  function handleRun() {
    setError(null);
    startTransition(async () => {
      const result = await triggerProposalAngle(leadId);
      if (result.ok) {
        setLocalAngle(result.output);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!hasResearchAudit) {
    return (
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/20 px-4 py-3">
        <p className="text-xs text-zinc-600">
          Run Lead Research first. Proposal Angle requires Agent 1 output.
        </p>
      </div>
    );
  }

  const hasAngle = localAngle !== null;

  return (
    <div className="space-y-4">
      <button
        onClick={handleRun}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/40 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
      >
        {isPending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
            Generating angle...
          </>
        ) : hasAngle ? (
          "Re-run proposal angle"
        ) : (
          "Run proposal angle"
        )}
      </button>

      {!hasAngle && !isPending && (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Produces proposal framing and prefill from Agent 1 research. Internal
          only. Does not send emails or change lead status.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {localAngle && (
        <AngleDisplay
          angle={localAngle}
          leadId={leadId}
          appliedAt={appliedAt}
        />
      )}
    </div>
  );
}
