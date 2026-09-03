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
      <div className="cf cf-success">
        <h3>Message received.</h3>
        <p>We will get back to you within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="cf">
      <div className="cf-row">
        <div className="cf-field">
          <label htmlFor="cf-name">Name <em>*</em></label>
          <input
            id="cf-name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            value={values.name}
            onChange={set("name")}
          />
        </div>
        <div className="cf-field">
          <label htmlFor="cf-email">Email <em>*</em></label>
          <input
            id="cf-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            onChange={set("email")}
          />
        </div>
      </div>

      <div className="cf-row">
        <div className="cf-field">
          <label htmlFor="cf-company">Company <em>Optional</em></label>
          <input
            id="cf-company"
            type="text"
            autoComplete="organization"
            placeholder="Your company"
            value={values.company}
            onChange={set("company")}
          />
        </div>
        <div className="cf-field">
          <label htmlFor="cf-reason">Reason</label>
          <select id="cf-reason" value={values.reason} onChange={set("reason")}>
            <option value="">Select a reason</option>
            <option value="demo">Book a demo</option>
            <option value="pricing">Pricing question</option>
            <option value="partnership">Partnership</option>
            <option value="press">Press inquiry</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="cf-field">
        <label htmlFor="cf-message">Message <em>*</em></label>
        <textarea
          id="cf-message"
          required
          rows={5}
          placeholder="Tell us what you are working on or what you need."
          value={values.message}
          onChange={set("message")}
        />
      </div>

      {state === "error" && <p className="cf-error">{errorMsg}</p>}

      <button type="submit" disabled={state === "submitting"} className="btn btn-a cf-submit">
        {state === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
