"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ResearchAuditCard } from "./research-audit-card";
import { ProposalAngleCard } from "./proposal-angle-card";
import { ProposalWriterCard } from "./proposal-writer-card";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";
import type { ProposalAngleOutput } from "@/lib/agents/proposal-angle/schema";
import type { ProposalWriterOutput } from "@/lib/agents/proposal-writer/schema";

type Section = "research" | "angle" | "writer";

/* ─── Snapshot strip ─────────────────────────────────────────────────────── */

function SnapshotStrip({
  research,
  angle,
  writer,
}: {
  research: LeadResearchOutput | null;
  angle: ProposalAngleOutput | null;
  writer: ProposalWriterOutput | null;
}) {
  if (!research) return null;

  return (
    <div className="space-y-2.5 border-b border-zinc-800/60 px-4 py-3">
      {/* Lane fit tags */}
      {research.proposal_angle_inputs.suggested_lane_fit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {research.proposal_angle_inputs.suggested_lane_fit.map((lane) => (
            <span
              key={lane}
              className="inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-2 py-0.5 text-[10px] font-medium text-brand"
            >
              {lane}
            </span>
          ))}
          {angle && (
            <span className="text-[10px] text-zinc-600">&middot;</span>
          )}
          {angle && (
            <span className="text-[10px] font-medium text-zinc-400">
              {angle.proposal_angle_title}
            </span>
          )}
        </div>
      )}

      {/* Summary line */}
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {writer?.optional_proposal_summary ??
          angle?.current_situation ??
          research.executive_summary}
      </p>
    </div>
  );
}

/* ─── Agent row ──────────────────────────────────────────────────────────── */

function AgentRow({
  step,
  label,
  status,
  summary,
  timestamp,
  warnings,
  isExpanded,
  onToggle,
  children,
}: {
  step: string;
  label: string;
  status: "done" | "idle" | "blocked";
  summary: string | null;
  timestamp: string | null;
  warnings: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/20"
      >
        <div className="mt-[5px] shrink-0">
          {status === "done" ? (
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
          ) : status === "blocked" ? (
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
          ) : (
            <div className="h-1.5 w-1.5 rounded-full ring-1 ring-zinc-700" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                {step}
              </span>
              {warnings > 0 && (
                <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/8 px-1.5 py-px text-[9px] font-medium text-amber-500/70">
                  {warnings}w
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {timestamp && (
                <span className="text-[10px] tabular-nums text-zinc-700">
                  {format(new Date(timestamp), "MMM d")}
                </span>
              )}
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                className={`shrink-0 text-zinc-700 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
              >
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {summary && !isExpanded && (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">
              {summary}
            </p>
          )}
          {!summary && !isExpanded && (
            <p className="mt-0.5 text-[11px] text-zinc-700">{label}</p>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800/40 px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Intelligence panel ─────────────────────────────────────────────────── */

export function IntelligencePanel({
  leadId,
  research,
  angle,
  writer,
  angleAppliedAt,
  writerAppliedAt,
}: {
  leadId: string;
  research: LeadResearchOutput | null;
  angle: ProposalAngleOutput | null;
  writer: ProposalWriterOutput | null;
  angleAppliedAt: string | null;
  writerAppliedAt: string | null;
}) {
  const [expanded, setExpanded] = useState<Section | null>(
    !research ? "research" : null
  );

  function toggle(section: Section) {
    setExpanded((prev) => (prev === section ? null : section));
  }

  // Use != null (not !==) to guard against undefined when DB column is missing on a row
  const hasResearch = research != null;
  const hasAngle = angle != null;
  const hasWriter = writer != null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          Intelligence
        </h2>
      </div>

      {/* Snapshot strip - only when at least agent 1 is done */}
      <SnapshotStrip research={research} angle={angle} writer={writer} />

      {/* Agent rows */}
      <AgentRow
        step="Agent 1"
        label="Lead Research"
        status={hasResearch ? "done" : "idle"}
        summary={
          hasResearch ? research.executive_summary : null
        }
        timestamp={hasResearch ? research.generated_at : null}
        warnings={hasResearch ? research.run_warnings.length : 0}
        isExpanded={expanded === "research"}
        onToggle={() => toggle("research")}
      >
        <ResearchAuditCard leadId={leadId} initialAudit={research} />
      </AgentRow>

      <AgentRow
        step="Agent 2"
        label="Proposal Angle"
        status={!hasResearch ? "blocked" : hasAngle ? "done" : "idle"}
        summary={hasAngle ? angle.proposal_angle_title : null}
        timestamp={hasAngle ? angle.generated_at : null}
        warnings={hasAngle ? angle.run_warnings.length : 0}
        isExpanded={expanded === "angle"}
        onToggle={() => toggle("angle")}
      >
        <ProposalAngleCard
          leadId={leadId}
          hasResearchAudit={hasResearch}
          initialAngle={angle}
          appliedAt={angleAppliedAt}
        />
      </AgentRow>

      <AgentRow
        step="Agent 3"
        label="Proposal Writer"
        status={!hasResearch || !hasAngle ? "blocked" : hasWriter ? "done" : "idle"}
        summary={
          hasWriter && writer
            ? (writer.optional_proposal_summary ??
                writer.proposal_prefill?.proposal_title ??
                null)
            : null
        }
        timestamp={hasWriter ? writer.generated_at : null}
        warnings={hasWriter ? writer.run_warnings.length : 0}
        isExpanded={expanded === "writer"}
        onToggle={() => toggle("writer")}
      >
        <ProposalWriterCard
          leadId={leadId}
          hasResearchAudit={hasResearch}
          hasProposalAngle={hasAngle}
          initialWriter={writer}
          appliedAt={writerAppliedAt}
        />
      </AgentRow>
    </div>
  );
}
