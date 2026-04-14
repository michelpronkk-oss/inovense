"use client";

import { useState, useTransition } from "react";
import {
  updateLeadStatus,
  updateLeadNotes,
  updateInternalNextStep,
  sendOnboarding,
  generateClientPortalToken,
  deleteLead,
} from "./actions";
import { ALL_STATUSES, STATUS_CONFIG } from "@/app/admin/config";
import type { LeadStatus, OnboardingStatus } from "@/lib/supabase-server";

/* ─── Status updater ────────────────────────────────────────────────────── */

export function StatusUpdater({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: LeadStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LeadStatus;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await updateLeadStatus(id, next);
      if (!result.success) {
        setError(result.error ?? "Update failed.");
        setStatus(currentStatus);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={status}
            onChange={handleChange}
            disabled={isPending}
            className="h-9 w-full appearance-none rounded-lg border border-zinc-700/80 bg-zinc-900 pl-3 pr-8 text-base text-zinc-200 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30 disabled:cursor-wait disabled:opacity-60 sm:text-sm [&>option]:bg-zinc-900"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {isPending && (
          <span className="text-xs text-zinc-600">Saving...</span>
        )}
      </div>

      {/* Live badge preview */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
          Current
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
            STATUS_CONFIG[status]?.color ?? STATUS_CONFIG.new.color
          }`}
        >
          {STATUS_CONFIG[status]?.label ?? status}
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ─── Notes editor ──────────────────────────────────────────────────────── */

export function NotesEditor({
  id,
  currentNotes,
}: {
  id: string;
  currentNotes: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  function handleSave() {
    setSaveState("idle");
    startTransition(async () => {
      const result = await updateLeadNotes(id, notes);
      setSaveState(result.success ? "saved" : "error");
      if (result.success) {
        setTimeout(() => setSaveState("idle"), 2500);
      }
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaveState("idle");
        }}
        rows={5}
        placeholder="Add internal notes about this lead..."
        className="w-full resize-none rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-3 text-base leading-relaxed text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30 sm:text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/60 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save notes"}
        </button>
        {saveState === "saved" && (
          <span className="text-xs text-emerald-400">Saved.</span>
        )}
        {saveState === "error" && (
          <span className="text-xs text-red-400">Failed to save.</span>
        )}
      </div>
    </div>
  );
}

/* ─── Internal next step ────────────────────────────────────────────────── */

export function NextStepEditor({
  id,
  currentNextStep,
}: {
  id: string;
  currentNextStep: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentNextStep ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  function handleSave() {
    setSaveState("idle");
    startTransition(async () => {
      const result = await updateInternalNextStep(id, value);
      setSaveState(result.success ? "saved" : "error");
      if (result.success) setTimeout(() => setSaveState("idle"), 2500);
    });
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaveState("idle");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="e.g. Send proposal by Friday"
        className="h-9 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-base text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30 sm:text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
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
    </div>
  );
}

/* ─── Delete lead ───────────────────────────────────────────────────────── */

export function DeleteLeadButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteLead(id);
      } catch {
        setError("Failed to delete. Please try again.");
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-zinc-500">
          This will permanently delete the lead and all associated data.
          This cannot be undone.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/60 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Yes, delete lead"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-900/30 bg-red-950/10 px-3 py-1.5 text-xs font-medium text-red-500/70 transition-colors hover:border-red-800/50 hover:bg-red-950/25 hover:text-red-400"
    >
      Delete lead
    </button>
  );
}

/* ─── Onboarding manager ────────────────────────────────────────────────── */

export function OnboardingManager({
  id,
  onboardingStatus,
  onboardingToken,
  onboardingSentAt,
  onboardingCompletedAt,
}: {
  id: string;
  onboardingStatus: OnboardingStatus;
  onboardingToken: string | null;
  onboardingSentAt: string | null;
  onboardingCompletedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<OnboardingStatus>(onboardingStatus);
  const [token, setToken] = useState<string | null>(onboardingToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getUrl(tok: string) {
    const origin =
      typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/onboarding/${tok}`;
  }

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await sendOnboarding(id);
      if (result.success && result.token) {
        setStatus("sent");
        setToken(result.token);
      } else {
        setError(result.error ?? "Failed to generate link.");
      }
    });
  }

  function handleCopy() {
    if (!token) return;
    navigator.clipboard.writeText(getUrl(token)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (status === "completed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
            Completed
          </span>
        </div>
        {onboardingCompletedAt && (
          <p className="text-xs text-zinc-600">
            Submitted{" "}
            {new Date(onboardingCompletedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        <p className="text-xs text-zinc-700">
          Onboarding brief is shown in the main panel below.
        </p>
      </div>
    );
  }

  if (status === "sent" && token) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-400">
            Sent
          </span>
          {onboardingSentAt && (
            <span className="text-[11px] text-zinc-600">
              {new Date(onboardingSentAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <p className="break-all font-mono text-[11px] leading-relaxed text-zinc-500">
            {getUrl(token)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/60 hover:text-zinc-100"
          >
            {copied ? "Copied." : "Copy link"}
          </button>
          <button
            onClick={handleSend}
            disabled={isPending}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-700 hover:text-zinc-400 disabled:cursor-wait disabled:opacity-50"
          >
            {isPending ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-zinc-600">
        Generate a secure link to send to the client. They complete the
        onboarding form and the data attaches to this lead.
      </p>
      <button
        onClick={handleSend}
        disabled={isPending}
        className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand disabled:cursor-wait disabled:opacity-50"
      >
        {isPending ? "Generating..." : "Generate onboarding link"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ClientPortalLinkManager({
  id,
  proposalToken,
}: {
  id: string;
  proposalToken: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(proposalToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getUrl(tok: string) {
    const origin =
      typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/client/${tok}`;
  }

  function handleGenerate(rotate = false) {
    setError(null);
    startTransition(async () => {
      const result = await generateClientPortalToken(id, rotate);
      if (result.success && result.token) {
        setToken(result.token);
      } else {
        setError(result.error ?? "Failed to generate portal link.");
      }
    });
  }

  function handleCopy() {
    if (!token) return;
    navigator.clipboard.writeText(getUrl(token)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-zinc-600">
          Generate a private workspace link for the client. It centralizes status,
          payment, onboarding, and key project documents.
        </p>
        <button
          onClick={() => handleGenerate()}
          disabled={isPending}
          className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand disabled:cursor-wait disabled:opacity-50"
        >
          {isPending ? "Generating..." : "Generate client portal link"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
        <p className="break-all font-mono text-[11px] leading-relaxed text-zinc-500">
          {getUrl(token)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleCopy}
          className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/60 hover:text-zinc-100"
        >
          {copied ? "Copied." : "Copy link"}
        </button>
        <button
          onClick={() => handleGenerate(true)}
          disabled={isPending}
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-700 hover:text-zinc-400 disabled:cursor-wait disabled:opacity-50"
        >
          {isPending ? "Refreshing..." : "Refresh token"}
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-700">
        Refresh token rotates both portal and proposal links because they share the same secure token.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
