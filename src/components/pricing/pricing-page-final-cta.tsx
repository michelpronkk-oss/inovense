"use client";

import Link from "next/link";
import { useEarlyAccess } from "@/components/early-access/early-access-provider";

export function PricingPageFinalCta({ heading, sub }: { heading: string; sub: string }) {
  const { openEarlyAccess, hasSubmitted } = useEarlyAccess();

  return (
    <section className="relative py-12 md:py-20">
      <div className="mx-auto max-w-4xl px-5 pt-10 text-center sm:px-6 md:pt-16">
        <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>{heading}</h2>
        <p className="mb-8 text-sm" style={{ color: "#6B7178" }}>{sub}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={(event) => openEarlyAccess({ trigger: event.currentTarget })} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-150 hover:-translate-y-px" style={{ background: "#4DE8E1", color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)" }}>
            {hasSubmitted ? "Request received" : "Request early access"}
          </button>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.025)", color: "#ECEFF3", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
            Book a 20-min demo
          </Link>
        </div>
      </div>
    </section>
  );
}
