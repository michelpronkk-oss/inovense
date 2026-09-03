"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStoredConsent,
  setStoredConsent,
  onOpenPreferencesRequest,
  type ConsentValue,
} from "@/lib/cookie-consent";
import { ATTR_STORAGE_KEY, SESSION_STORAGE_KEY } from "@/lib/attribution";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(getStoredConsent() === null);
    }, 0);
    const unsubscribe = onOpenPreferencesRequest(() => setVisible(true));
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  function choose(value: ConsentValue) {
    if (value === "declined") {
      // A prior visit may have already written attribution data before a
      // choice was made — declining clears it, not just stops future writes.
      try {
        window.localStorage.removeItem(ATTR_STORAGE_KEY);
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    setStoredConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[80]"
      style={{ borderTop: "1px solid rgba(255,255,255,.08)", background: "#080b10" }}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <p className="text-[13.5px] leading-relaxed" style={{ color: "#A7B1BE" }}>
          We use strictly necessary cookies to run Auterim, and optional analytics cookies to understand how the product is used. No advertising cookies, ever.{" "}
          <Link href="/cookies" className="underline underline-offset-2" style={{ color: "#F6F8FB" }}>
            Cookie Policy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="cc-btn-decline px-5 py-2.5 text-sm font-medium transition-colors"
            style={{ background: "transparent", color: "#E7EBEF", border: "1px solid rgba(255,255,255,.18)" }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="cc-btn-accept px-5 py-2.5 text-sm font-medium transition-colors"
            style={{ background: "#37E6D4", color: "#04211E" }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
