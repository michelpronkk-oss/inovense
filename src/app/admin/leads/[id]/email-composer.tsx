"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EMAIL_TEMPLATE_LIST,
  EMAIL_TEMPLATES,
  buildEmailHtml,
  type EmailTemplateType,
} from "@/lib/email-templates";
import { sendLeadEmail } from "./email-actions";

type Props = {
  leadId: string;
  firstName: string;
  company: string;
  workEmail: string;
  onboardingToken: string | null;
};

/* ─── Action buttons panel ──────────────────────────────────────────────── */

export function EmailActionsPanel({
  leadId,
  firstName,
  company,
  workEmail,
  onboardingToken,
}: Props) {
  const [activeType, setActiveType] = useState<EmailTemplateType | null>(null);

  const templates = EMAIL_TEMPLATE_LIST;

  return (
    <>
      <div className="space-y-1.5">
        {templates.map((t) => {
          const isDecline = t.type === "decline";
          return (
            <button
              key={t.type}
              onClick={() => setActiveType(t.type)}
              className={`group flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                isDecline
                  ? "border-zinc-800 text-zinc-600 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-400/80"
                  : "border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <span>{t.label}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
                  isDecline ? "text-zinc-700" : "text-zinc-700"
                }`}
              >
                <path
                  d="M2.5 6h7M6.5 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>

      {activeType && (
        <EmailComposerModal
          leadId={leadId}
          firstName={firstName}
          company={company}
          workEmail={workEmail}
          onboardingToken={onboardingToken}
          templateType={activeType}
          onClose={() => setActiveType(null)}
        />
      )}
    </>
  );
}

/* ─── Compose modal ─────────────────────────────────────────────────────── */

function EmailComposerModal({
  leadId,
  firstName,
  company,
  workEmail,
  onboardingToken,
  templateType,
  onClose,
}: Props & {
  templateType: EmailTemplateType;
  onClose: () => void;
}) {
  const router = useRouter();
  const template = EMAIL_TEMPLATES[templateType];

  const [subject, setSubject] = useState(() =>
    template.defaultSubject(firstName, company)
  );
  const [body, setBody] = useState(() =>
    template.defaultBody(firstName, company)
  );
  const [isPending, startTransition] = useTransition();
  const [sendState, setSendState] = useState<"idle" | "sent" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const previewCta =
    template.hasCta && onboardingToken
      ? {
          text: "Complete onboarding brief",
          href: `${origin}/onboarding/${onboardingToken}`,
        }
      : template.hasCta
      ? { text: "Complete onboarding brief", href: "#" }
      : undefined;

  const previewHtml = useMemo(
    () =>
      buildEmailHtml({
        eyebrow: template.eyebrow,
        heading: template.heading(firstName),
        body,
        cta: previewCta,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [body, template, firstName, origin, onboardingToken]
  );

  function handleSend() {
    setSendError(null);
    startTransition(async () => {
      const result = await sendLeadEmail(leadId, templateType, subject, body);
      if (result.success) {
        setSendState("sent");
        router.refresh();
      } else {
        setSendState("error");
        setSendError(result.error ?? "Send failed.");
      }
    });
  }

  const isDecline = templateType === "decline";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 p-4 pt-12 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[calc(100vh-6rem)] w-full max-w-5xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">

        {/* Left: editor */}
        <div className="flex w-full shrink-0 flex-col border-r border-zinc-800 md:w-[400px]">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Compose
              </p>
              <p className="mt-0.5 text-sm font-medium text-zinc-200">
                {template.label}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M2 2l10 10M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">

            {/* To */}
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                To
              </label>
              <div className="flex h-9 items-center rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 text-sm text-zinc-500">
                {workEmail}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label
                htmlFor="email-subject"
                className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
              >
                Subject
              </label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setSendState("idle");
                }}
                className="h-9 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col">
              <label
                htmlFor="email-body"
                className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
              >
                Body
              </label>
              <textarea
                id="email-body"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setSendState("idle");
                }}
                rows={11}
                className="w-full resize-none rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-3 text-sm leading-relaxed text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
              />
              {template.hasCta && (
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-700">
                  The onboarding link button appears automatically below your message.
                </p>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-zinc-800 p-5">
            {sendState === "sent" && (
              <p className="mb-3 text-xs text-emerald-400">
                Email sent to {workEmail}.
              </p>
            )}
            {sendState === "error" && (
              <p className="mb-3 text-xs text-red-400">
                {sendError ?? "Send failed. Please try again."}
              </p>
            )}
            <div className="flex items-center gap-3">
              {sendState === "sent" ? (
                <button
                  onClick={onClose}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSend}
                    disabled={isPending || !subject.trim() || !body.trim()}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${
                      isDecline
                        ? "border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                        : "bg-brand text-zinc-950 hover:bg-brand/90"
                    }`}
                  >
                    {isPending ? "Sending..." : "Send email"}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={isPending}
                    className="text-xs text-zinc-600 transition-colors hover:text-zinc-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Right: live preview */}
        <div className="hidden flex-1 flex-col overflow-hidden md:flex">
          <div className="shrink-0 border-b border-zinc-800 px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Preview
            </p>
          </div>
          <div className="flex-1 overflow-hidden bg-[#09090b]">
            <iframe
              srcDoc={previewHtml}
              title="Email preview"
              className="h-full w-full border-0"
              aria-label="Email preview"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
