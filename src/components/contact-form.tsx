"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [values, setValues] = useState({
    name: "",
    email: "",
    company: "",
    reason: "",
    message: "",
  });

  function set(field: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.ok) {
        setState("success");
      } else {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Could not send your message. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 9l4.5 4.5L15 5" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mb-2 text-base font-semibold text-zinc-100">Message received</h3>
        <p className="text-sm text-zinc-400">We will get back to you within one business day.</p>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border border-zinc-800/90 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-300/45 focus:ring-0";
  const labelCls = "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className={labelCls}>Name <span className="text-zinc-700">*</span></label>
          <input
            id="cf-name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            value={values.name}
            onChange={set("name")}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="cf-email" className={labelCls}>Email <span className="text-zinc-700">*</span></label>
          <input
            id="cf-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            onChange={set("email")}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-company" className={labelCls}>Company <span className="text-zinc-700 normal-case tracking-normal">optional</span></label>
          <input
            id="cf-company"
            type="text"
            autoComplete="organization"
            placeholder="Your company"
            value={values.company}
            onChange={set("company")}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="cf-reason" className={labelCls}>Reason</label>
          <select
            id="cf-reason"
            value={values.reason}
            onChange={set("reason")}
            className={`${inputCls} appearance-none`}
          >
            <option value="">Select a reason</option>
            <option value="demo">Book a demo</option>
            <option value="pricing">Pricing question</option>
            <option value="partnership">Partnership</option>
            <option value="press">Press inquiry</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="cf-message" className={labelCls}>Message <span className="text-zinc-700">*</span></label>
        <textarea
          id="cf-message"
          required
          rows={5}
          placeholder="Tell us what you are working on or what you need."
          value={values.message}
          onChange={set("message")}
          className={`${inputCls} resize-none`}
        />
      </div>

      {state === "error" && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="inline-flex w-full items-center justify-center rounded-xl px-7 py-3 text-sm font-medium text-[#04130F] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        style={{
          background: "#4DE8E1",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 24px -8px rgba(77,232,225,0.5)",
        }}
      >
        {state === "submitting" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
