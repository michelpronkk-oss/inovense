"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { readStoredAttribution } from "@/lib/attribution";
import { parseEarlyAccessSubmission, type EarlyAccessPlan, type EarlyAccessTeamSize } from "@/lib/early-access/validation";
import { PLAN_LABELS } from "@/lib/plan-identity";
import "./early-access.css";

type EarlyAccessContextValue = {
  openEarlyAccess: (options?: { plan?: EarlyAccessPlan | null; trigger?: HTMLElement | null }) => void;
  hasSubmitted: boolean;
};

const EarlyAccessContext = createContext<EarlyAccessContextValue | null>(null);
const TEAM_SIZES: readonly EarlyAccessTeamSize[] = ["1–5", "6–20", "21–50", "51–100", "101–250", "251+"];
const PLAN_NAMES = PLAN_LABELS;
const EMPTY_VALUES = { name: "", email: "", company: "", role: "", teamSize: "" as EarlyAccessTeamSize | "", useCase: "" };
type FieldName = keyof typeof EMPTY_VALUES;

function track(event: "early_access_modal_opened" | "early_access_started" | "early_access_submitted" | "early_access_success", plan: EarlyAccessPlan | null) {
  const analyticsWindow = window as Window & { gtag?: (command: string, eventName: string, parameters?: Record<string, string>) => void };
  if (typeof analyticsWindow.gtag === "function") {
    analyticsWindow.gtag("event", event, plan ? { interested_plan: plan } : undefined);
  }
}

export function useEarlyAccess() {
  const context = useContext(EarlyAccessContext);
  if (!context) throw new Error("useEarlyAccess must be used within EarlyAccessProvider.");
  return context;
}

export function useOptionalEarlyAccess() {
  return useContext(EarlyAccessContext);
}

export default function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<EarlyAccessPlan | null>(null);
  const [submission, setSubmission] = useState<{ email: string; plan: EarlyAccessPlan | null } | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openEarlyAccess = useCallback((options?: { plan?: EarlyAccessPlan | null; trigger?: HTMLElement | null }) => {
    const selectedPlan = options?.plan ?? submission?.plan ?? null;
    setPlan(selectedPlan);
    returnFocusRef.current = options?.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setIsOpen(true);
    track("early_access_modal_opened", selectedPlan);
  }, [submission]);

  const closeEarlyAccess = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (isOpen) {
      const previousHtmlOverflow = document.documentElement.style.overflow;
      const previousBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overflow = previousBodyOverflow;
      };
    }
    if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    return undefined;
  }, [isOpen]);

  return (
    <EarlyAccessContext.Provider value={{ openEarlyAccess, hasSubmitted: Boolean(submission) }}>
      {children}
      {isOpen && <EarlyAccessModal plan={plan} initialSuccessEmail={submission?.email ?? ""} onSuccess={(email) => setSubmission({ email, plan })} onClose={closeEarlyAccess} />}
    </EarlyAccessContext.Provider>
  );
}

function EarlyAccessModal({ plan, initialSuccessEmail, onSuccess, onClose }: { plan: EarlyAccessPlan | null; initialSuccessEmail: string; onSuccess: (email: string) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successEmail, setSuccessEmail] = useState(initialSuccessEmail);
  const [hasStarted, setHasStarted] = useState(false);
  const isSuccess = Boolean(successEmail);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isSuccess) {
      dialog?.querySelector<HTMLElement>("[data-ea-done]")?.focus();
    } else if (window.matchMedia("(max-width: 600px)").matches) {
      // Keep the sheet visible without opening the mobile keyboard until a
      // visitor deliberately selects a field.
      dialog?.focus();
    } else {
      dialog?.querySelector<HTMLElement>("input[name=name]")?.focus();
    }
  }, [isSuccess]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select:not([disabled]),textarea:not([disabled])',
      ) ?? []).filter((item) => item.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function markStarted() {
    if (hasStarted) return;
    setHasStarted(true);
    track("early_access_started", plan);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError("");
    const params = new URLSearchParams(window.location.search);
    const stored = readStoredAttribution();
    const sourcePath = window.location.pathname || "/";
    const formPayload = {
      ...values,
      interestedPlan: plan,
      sourcePath,
      referrer: document.referrer || null,
      utmSource: params.get("utm_source") || stored?.utmSource || null,
      utmMedium: params.get("utm_medium") || stored?.utmMedium || null,
      utmCampaign: params.get("utm_campaign") || stored?.utmCampaign || null,
      utmContent: params.get("utm_content") || stored?.utmContent || null,
      utmTerm: params.get("utm_term") || stored?.utmTerm || null,
      locale: document.documentElement.lang || "en",
    };
    const validation = parseEarlyAccessSubmission(formPayload);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      const field = Object.keys(validation.errors)[0];
      dialogRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
      return;
    }

    setIsSubmitting(true);
    track("early_access_submitted", plan);
    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; fieldErrors?: Record<string, string> };
      if (!response.ok || result.ok !== true) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setSubmitError("We couldn’t send your request just now. Please try again.");
        return;
      }
      setSuccessEmail(validation.data.email);
      onSuccess(validation.data.email);
      track("early_access_success", plan);
    } catch {
      setSubmitError("We couldn’t send your request just now. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="ea-backdrop" onMouseDown={handleBackdrop}>
      <div
        aria-modal="true"
        aria-labelledby="early-access-title"
        aria-describedby="early-access-description"
        className={`ea-dialog${isSuccess ? " ea-dialog-success" : ""}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button type="button" className="ea-close" aria-label="Close early access dialog" onClick={onClose}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>

        {isSuccess ? (
          <div className="ea-success-content">
            <span className="ea-eyebrow">EARLY ACCESS REQUESTED</span>
            <div className="ea-success-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="m5 12.5 4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <h2 id="early-access-title">You’re on the early access list.</h2>
            <p id="early-access-description">We’re opening Auterim to a small group of teams before public launch. If your use case is a good fit for the current beta, we’ll reach out with next steps.</p>
            {plan && <span className="ea-plan-context">Plan interest <strong>{PLAN_NAMES[plan]}</strong></span>}
            <div className="ea-confirmation-address"><span>Request submitted as</span><strong>{successEmail}</strong></div>
            <button type="button" className="ea-submit" data-ea-done onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="ea-heading">
              <span className="ea-eyebrow">EARLY ACCESS</span>
              <h2 id="early-access-title">Get early access to Auterim.</h2>
              <p id="early-access-description">We’re opening Auterim to a small group of teams before public launch. Tell us what you want your operators to handle first.</p>
              {plan && <span className="ea-plan-context">Plan interest <strong>{PLAN_NAMES[plan]}</strong></span>}
            </div>

            <form className="ea-form" onSubmit={submit} noValidate>
              <div className="ea-honeypot" aria-hidden="true">
                <label htmlFor="early-access-website">Website</label>
                <input id="early-access-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="ea-fields">
                <Field label="Name" name="name" value={values.name} error={fieldErrors.name} autoComplete="name" onChange={(value) => updateField("name", value)} onFocus={markStarted} />
                <Field label="Work email" name="email" value={values.email} error={fieldErrors.email} autoComplete="email" type="email" onChange={(value) => updateField("email", value)} onFocus={markStarted} />
                <Field label="Company" name="company" value={values.company} error={fieldErrors.company} autoComplete="organization" onChange={(value) => updateField("company", value)} onFocus={markStarted} />
                <Field label="Role / job title" name="role" value={values.role} error={fieldErrors.role} autoComplete="organization-title" required={false} onChange={(value) => updateField("role", value)} onFocus={markStarted} />
                <div className="ea-field">
                  <label htmlFor="early-access-teamSize">Team size <span aria-hidden="true">*</span></label>
                  <select id="early-access-teamSize" name="teamSize" value={values.teamSize} required aria-required="true" aria-invalid={Boolean(fieldErrors.teamSize)} aria-describedby={fieldErrors.teamSize ? "early-access-teamSize-error" : undefined} onChange={(event) => updateField("teamSize", event.target.value)} onFocus={markStarted}>
                    <option value="" disabled>Select team size</option>
                    {TEAM_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                  {fieldErrors.teamSize && <span className="ea-field-error" id="early-access-teamSize-error">{fieldErrors.teamSize}</span>}
                </div>
                <div className="ea-field ea-field-use-case">
                  <label htmlFor="early-access-useCase">What would you want Auterim to handle first? <span aria-hidden="true">*</span></label>
                  <textarea id="early-access-useCase" name="useCase" value={values.useCase} required aria-required="true" maxLength={1200} aria-invalid={Boolean(fieldErrors.useCase)} aria-describedby={fieldErrors.useCase ? "early-access-useCase-error" : undefined} placeholder="Following up on open deals, client onboarding, support escalation…" onChange={(event) => updateField("useCase", event.target.value)} onFocus={markStarted} />
                  {fieldErrors.useCase && <span className="ea-field-error" id="early-access-useCase-error">{fieldErrors.useCase}</span>}
                </div>
              </div>
              {submitError && <p className="ea-submit-error" role="alert">{submitError}</p>}
              <div className="ea-form-footer">
                <button type="submit" className="ea-submit" disabled={isSubmitting}>{isSubmitting ? "Sending request…" : "Request early access"}</button>
                <span>We’ll review your use case and follow up if there’s a fit.</span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  error,
  autoComplete,
  type = "text",
  required = true,
  onChange,
  onFocus,
}: {
  label: string;
  name: FieldName;
  value: string;
  error?: string;
  autoComplete: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
}) {
  const id = `early-access-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="ea-field">
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <input id={id} name={name} type={type} value={value} required={required} maxLength={name === "name" ? 100 : name === "company" ? 160 : name === "role" ? 100 : 254} autoComplete={autoComplete} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(event.target.value)} onFocus={onFocus} />
      {error && <span className="ea-field-error" id={errorId}>{error}</span>}
    </div>
  );
}
