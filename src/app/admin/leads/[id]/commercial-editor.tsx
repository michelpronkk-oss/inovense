"use client";

import { useState, useTransition } from "react";
import {
  updateProposalFields,
  updatePaymentFields,
  markDepositPaid,
  updateProjectStatus,
} from "./actions";
import type { ProjectStatus, OnboardingStatus } from "@/lib/supabase-server";

/* ─── Shared helpers ────────────────────────────────────────────────────── */

function isUrl(str: string) {
  return str.startsWith("http://") || str.startsWith("https://");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SaveRow({
  isPending,
  saveState,
  onSave,
}: {
  isPending: boolean;
  saveState: "idle" | "saved" | "error";
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={isPending}
        className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/60 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
      {saveState === "saved" && (
        <span className="text-xs text-emerald-400">Saved.</span>
      )}
      {saveState === "error" && (
        <span className="text-xs text-red-400">Failed to save.</span>
      )}
    </div>
  );
}

function inputCls(extra?: string) {
  return `h-9 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30 ${extra ?? ""}`;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
      {children}
    </p>
  );
}

/* ─── Proposal editor ───────────────────────────────────────────────────── */

export function ProposalEditor({
  id,
  currentUrl,
  currentNotes,
  proposalSentAt,
}: {
  id: string;
  currentUrl: string | null;
  currentNotes: string | null;
  proposalSentAt: string | null;
}) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  function handleSave() {
    setSaveState("idle");
    startTransition(async () => {
      const result = await updateProposalFields(id, url, notes);
      setSaveState(result.success ? "saved" : "error");
      if (result.success) setTimeout(() => setSaveState("idle"), 2500);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Proposal URL</Label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaveState("idle");
            }}
            placeholder="https://notion.so/..."
            className={inputCls("flex-1")}
          />
          {isUrl(url) && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
            >
              Open
            </a>
          )}
        </div>
      </div>

      <div>
        <Label>Proposal notes</Label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaveState("idle");
          }}
          rows={3}
          placeholder="Scope summary, version notes, key assumptions..."
          className="w-full resize-none rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-3 text-sm leading-relaxed text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
        />
      </div>

      {proposalSentAt && (
        <p className="text-xs text-zinc-600">
          Proposal email sent {fmtDate(proposalSentAt)}
        </p>
      )}

      <SaveRow
        isPending={isPending}
        saveState={saveState}
        onSave={handleSave}
      />
    </div>
  );
}

/* ─── Payment editor ────────────────────────────────────────────────────── */

export function PaymentEditor({
  id,
  currentPaymentLink,
  currentInvoiceReference,
  currentDepositAmount,
  depositPaidAt,
  currentProjectStartDate,
}: {
  id: string;
  currentPaymentLink: string | null;
  currentInvoiceReference: string | null;
  currentDepositAmount: number | null;
  depositPaidAt: string | null;
  currentProjectStartDate: string | null;
}) {
  const [paymentLink, setPaymentLink] = useState(currentPaymentLink ?? "");
  const [invoiceRef, setInvoiceRef] = useState(
    currentInvoiceReference ?? ""
  );
  const [amount, setAmount] = useState(
    currentDepositAmount != null ? String(currentDepositAmount) : ""
  );
  const [startDate, setStartDate] = useState(
    currentProjectStartDate ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [markPaidPending, startMarkPaidTransition] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle"
  );
  const [markPaidState, setMarkPaidState] = useState<
    "idle" | "error"
  >("idle");
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  // Track deposit paid locally so the UI updates immediately after the action
  const [paidAt, setPaidAt] = useState<string | null>(depositPaidAt);

  function handleSave() {
    setSaveState("idle");
    startTransition(async () => {
      const result = await updatePaymentFields(id, {
        paymentLink,
        invoiceReference: invoiceRef,
        depositAmount: amount,
        projectStartDate: startDate,
      });
      setSaveState(result.success ? "saved" : "error");
      if (result.success) setTimeout(() => setSaveState("idle"), 2500);
    });
  }

  function handleMarkPaid() {
    setMarkPaidState("idle");
    setMarkPaidError(null);
    startMarkPaidTransition(async () => {
      const result = await markDepositPaid(id);
      if (result.success) {
        setPaidAt(new Date().toISOString());
      } else {
        setMarkPaidState("error");
        setMarkPaidError(result.error ?? "Failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Payment link */}
      <div>
        <Label>Payment link</Label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={paymentLink}
            onChange={(e) => {
              setPaymentLink(e.target.value);
              setSaveState("idle");
            }}
            placeholder="https://stripe.com/... or Wise link"
            className={inputCls("flex-1")}
          />
          {isUrl(paymentLink) && (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
            >
              Open
            </a>
          )}
        </div>
      </div>

      {/* Invoice ref + deposit amount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Invoice ref.</Label>
          <input
            type="text"
            value={invoiceRef}
            onChange={(e) => {
              setInvoiceRef(e.target.value);
              setSaveState("idle");
            }}
            placeholder="INV-001"
            className={inputCls()}
          />
        </div>
        <div>
          <Label>Deposit (€)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
              €
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSaveState("idle");
              }}
              placeholder="0.00"
              className={inputCls("pl-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
            />
          </div>
        </div>
      </div>

      {/* Project start date */}
      <div>
        <Label>Project start date</Label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setSaveState("idle");
          }}
          className={inputCls(
            "text-zinc-300 [color-scheme:dark]"
          )}
        />
      </div>

      <SaveRow
        isPending={isPending}
        saveState={saveState}
        onSave={handleSave}
      />

      {/* Deposit paid */}
      <div className="border-t border-zinc-800/60 pt-4">
        {paidAt ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              Deposit paid
            </span>
            <span className="text-[11px] text-zinc-600">
              {fmtDate(paidAt)}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleMarkPaid}
              disabled={markPaidPending}
              className="w-full rounded-lg border border-brand/30 bg-brand/10 px-4 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/15 hover:border-brand/40 disabled:cursor-wait disabled:opacity-50"
            >
              {markPaidPending ? "Saving..." : "Mark deposit as paid"}
            </button>
            {markPaidState === "error" && (
              <p className="text-xs text-red-400">
                {markPaidError ?? "Something went wrong."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Project status editor ─────────────────────────────────────────────── */

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "ready", label: "Ready" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  not_started: "text-zinc-500",
  ready: "text-sky-400",
  active: "text-emerald-400",
  paused: "text-amber-400",
  completed: "text-violet-400",
};

export function ProjectStatusEditor({
  id,
  currentProjectStatus,
  depositPaidAt,
  onboardingStatus,
  projectStartDate,
}: {
  id: string;
  currentProjectStatus: ProjectStatus;
  depositPaidAt: string | null;
  onboardingStatus: OnboardingStatus;
  projectStartDate: string | null;
}) {
  const [status, setStatus] = useState<ProjectStatus>(currentProjectStatus);
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const depositPaid = depositPaidAt != null;
  const onboardingDone = onboardingStatus === "completed";
  const readyToActivate = depositPaid && onboardingDone;

  function handleChange(val: ProjectStatus) {
    setStatus(val);
    setSaveState("idle");
    startTransition(async () => {
      const result = await updateProjectStatus(id, val);
      setSaveState(result.success ? "saved" : "error");
      if (result.success) setTimeout(() => setSaveState("idle"), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Status select */}
      <div>
        <Label>Project status</Label>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value as ProjectStatus)}
            disabled={isPending}
            className={`h-9 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30 disabled:cursor-wait disabled:opacity-50 ${PROJECT_STATUS_COLORS[status]}`}
          >
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-zinc-900 text-zinc-300"
              >
                {opt.label}
              </option>
            ))}
          </select>
          {saveState === "saved" && (
            <span className="shrink-0 text-xs text-emerald-400">Saved.</span>
          )}
          {saveState === "error" && (
            <span className="shrink-0 text-xs text-red-400">Failed.</span>
          )}
        </div>
      </div>

      {/* Start date (read-only display) */}
      {projectStartDate && (
        <div>
          <Label>Start date</Label>
          <p className="text-sm tabular-nums text-zinc-400">
            {new Date(projectStartDate + "T12:00:00").toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" }
            )}
          </p>
        </div>
      )}

      {/* Activation readiness indicator */}
      <div className="border-t border-zinc-800/60 pt-4">
        <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
          Activation readiness
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${depositPaid ? "bg-emerald-500" : "bg-zinc-700"}`}
            />
            <span
              className={`text-xs ${depositPaid ? "text-zinc-400" : "text-zinc-600"}`}
            >
              Deposit paid
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${onboardingDone ? "bg-emerald-500" : "bg-zinc-700"}`}
            />
            <span
              className={`text-xs ${onboardingDone ? "text-zinc-400" : "text-zinc-600"}`}
            >
              Onboarding completed
            </span>
          </div>
        </div>
        {readyToActivate && status === "not_started" && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-xs font-medium text-emerald-400">
              Ready to activate. Set status to Active.
            </p>
          </div>
        )}
        {readyToActivate && status === "active" && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-xs text-emerald-500/70">Project is live.</p>
          </div>
        )}
      </div>
    </div>
  );
}
