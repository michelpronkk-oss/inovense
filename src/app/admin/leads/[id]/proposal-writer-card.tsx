"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  triggerProposalWriter,
  applyProposalWriterToProposalFields,
} from "./proposal-writer-actions";
import type { ProposalWriterOutput } from "@/lib/agents/proposal-writer/schema";
import { format } from "date-fns";

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function ContentField({
  label,
  value,
}: {
  label: string;
  value: string | null;
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
      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
        {value}
      </p>
    </div>
  );
}

/* ─── Output display ─────────────────────────────────────────────────────── */

function WriterDisplay({
  writer,
  leadId,
  appliedAt,
}: {
  writer: ProposalWriterOutput;
  leadId: string;
  appliedAt: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"content" | "email" | "notes">("content");
  const [applyPending, startApplyTransition] = useTransition();
  const [applyError, setApplyError] = useState<string | null>(null);
  const [localAppliedAt, setLocalAppliedAt] = useState<string | null>(appliedAt);
  const [confirmApply, setConfirmApply] = useState(false);

  const tabs = [
    { key: "content" as const, label: "Content" },
    { key: "email" as const, label: "Email" },
    { key: "notes" as const, label: "Notes" },
  ];

  const hasSafetyRedactions = writer.safety_redactions.length > 0;
  const hasWarnings = writer.run_warnings.length > 0;

  function handleApply() {
    if (!confirmApply) {
      setConfirmApply(true);
      return;
    }
    setApplyError(null);
    setConfirmApply(false);
    startApplyTransition(async () => {
      const result = await applyProposalWriterToProposalFields(leadId);
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
            {writer.output_language === "nl" ? "NL" : "EN"}
          </span>
          {hasSafetyRedactions && (
            <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/8 px-2 py-0.5 text-[10px] font-medium text-violet-400/80">
              {writer.safety_redactions.length} redacted
            </span>
          )}
          {hasWarnings && (
            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-0.5 text-[10px] font-medium text-amber-500/80">
              {writer.run_warnings.length} warning
              {writer.run_warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-[10px] tabular-nums text-zinc-700">
          {format(new Date(writer.generated_at), "MMM d, yyyy, HH:mm")}
        </span>
      </div>

      {/* Summary */}
      {writer.optional_proposal_summary && (
        <p className="text-xs leading-relaxed text-zinc-400">
          {writer.optional_proposal_summary}
        </p>
      )}

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

      {/* Content tab */}
      {tab === "content" && (
        <div className="space-y-4">
          <ContentField
            label="Proposal title"
            value={writer.proposal_prefill.proposal_title}
          />
          <ContentField
            label="Intro"
            value={writer.proposal_prefill.proposal_intro}
          />
          <ContentField
            label="Scope"
            value={writer.proposal_prefill.proposal_scope}
          />
          <ContentField
            label="Deliverables"
            value={writer.proposal_prefill.proposal_deliverables}
          />
          <ContentField
            label="Timeline"
            value={writer.proposal_prefill.proposal_timeline}
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
                  deliverables, and timeline. Continue?
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
                  ? "Re-apply to proposal"
                  : "Apply to proposal"}
              </button>
            )}

            {applyError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                <p className="text-[11px] text-red-400">{applyError}</p>
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-zinc-700">
              Writes title, intro, scope, deliverables, and timeline. Does
              not change price, deposit, notes, or lead status.
            </p>
          </div>
        </div>
      )}

      {/* Email tab */}
      {tab === "email" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Subject
            </p>
            <p className="text-xs text-zinc-300">
              {writer.proposal_email_prefill.subject}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Body
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
              {writer.proposal_email_prefill.body}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/20 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-zinc-600">
              Open Send email and click Proposal ready to use this draft.
              The Use Proposal Writer draft button will appear there.
            </p>
          </div>
        </div>
      )}

      {/* Notes tab */}
      {tab === "notes" && (
        <div className="space-y-4">
          {writer.internal_notes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Internal notes
              </p>
              <ul className="space-y-1">
                {writer.internal_notes.map((note, i) => (
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

          {hasSafetyRedactions && (
            <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-violet-500/80">
                Content boundary: redacted from client copy
              </p>
              <ul className="space-y-1">
                {writer.safety_redactions.map((r, i) => (
                  <li
                    key={i}
                    className="text-[11px] leading-relaxed text-violet-500/60"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-amber-600">
                Warnings
              </p>
              <ul className="space-y-1">
                {writer.run_warnings.map((w, i) => (
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

          <p className="text-[10px] text-zinc-700">
            Language: {writer.output_language.toUpperCase()} (
            {writer.language_reason})
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────────── */

export function ProposalWriterCard({
  leadId,
  hasResearchAudit,
  hasProposalAngle,
  initialWriter,
  appliedAt,
}: {
  leadId: string;
  hasResearchAudit: boolean;
  hasProposalAngle: boolean;
  initialWriter: ProposalWriterOutput | null;
  appliedAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localWriter, setLocalWriter] = useState<ProposalWriterOutput | null>(
    initialWriter
  );

  function handleRun() {
    setError(null);
    startTransition(async () => {
      const result = await triggerProposalWriter(leadId);
      if (result.ok) {
        setLocalWriter(result.output);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!hasResearchAudit || !hasProposalAngle) {
    return (
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/20 px-4 py-3">
        <p className="text-xs text-zinc-600">
          {!hasResearchAudit
            ? "Run Lead Research first."
            : "Run Proposal Angle first."}{" "}
          Proposal Writer requires both Agent 1 and Agent 2 output.
        </p>
      </div>
    );
  }

  const hasWriter = localWriter !== null;

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
            Writing proposal...
          </>
        ) : hasWriter ? (
          "Re-run proposal writer"
        ) : (
          "Run proposal writer"
        )}
      </button>

      {!hasWriter && !isPending && (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Writes client-facing proposal content and a proposal email draft.
          Internal strategy is never included. Does not send or change status.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {localWriter && (
        <WriterDisplay
          writer={localWriter}
          leadId={leadId}
          appliedAt={appliedAt}
        />
      )}
    </div>
  );
}
