"use client";

import type { ReactNode } from "react";
import V3Footer from "./v3-footer";
import { useReveal } from "./use-reveal";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";

export default function LegalEditorial({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  useReveal("auterim-v3-page");

  return (
    <div className="auterim-v3-page">
      <section className="page-hero">
        <div className="wrap">
          <div className="close-main rv">
            <span className="lbl"><i aria-hidden="true" />Legal</span>
            <h1>{title}</h1>
            <span className="legal-updated">Last updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="legal-copy rv">{children}</div>
        </div>
      </section>

      <V3Footer />
    </div>
  );
}
