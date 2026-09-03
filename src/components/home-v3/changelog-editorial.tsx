"use client";

import Link from "next/link";
import V3Header from "./v3-header";
import V3Footer from "./v3-footer";
import { useReveal } from "./use-reveal";
import type { ChangelogChangeType, ChangelogRelease } from "@/data/changelog";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./changelog-editorial.css";

const labels: Record<ChangelogChangeType, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

export default function ChangelogEditorial({ releases }: { releases: ChangelogRelease[] }) {
  useReveal("auterim-v3-page");

  return (
    <div className="auterim-v3-page changelog-page">
      <V3Header />
      <main>
        <section className="page-hero">
          <div className="wrap">
            <div className="close-main rv">
              <span className="lbl"><i aria-hidden="true" />Changelog</span>
              <h1>What&apos;s new in Auterim</h1>
              <p>Product updates, improvements and new ways Auterim can work across your business.</p>
            </div>
          </div>
        </section>

        <section className="sec changelog-releases">
          <div className="wrap">
            <div className="changelog-list">
              {releases.map((release, index) => (
                <article className="changelog-release rv" key={`${release.date}-${release.title}`}>
                  <div className="changelog-release-meta">
                    <span className="changelog-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="changelog-date">{release.date}</span>
                  </div>
                  <div className="changelog-release-body">
                    <div className="changelog-release-heading">
                      <span className="changelog-status"><i />{index === 0 ? "Latest release" : "Release"}</span>
                      <h2>{release.title}</h2>
                      <p>{release.summary}</p>
                    </div>
                    <div className="changelog-changes">
                      {release.changes.map((change) => (
                        <div className="changelog-change" key={`${release.title}-${change.title}`}>
                          <span className={`changelog-type changelog-type-${change.type}`}>{labels[change.type]}</span>
                          <div>
                            <h3>{change.title}</h3>
                            <p>{change.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="changelog-end rv">
              <span className="lbl"><i aria-hidden="true" />Built in public</span>
              <p>Auterim is being shaped around the way real teams work.</p>
              <Link href="/#top">Back to the platform <span>→</span></Link>
            </div>
          </div>
        </section>
      </main>
      <V3Footer />
    </div>
  );
}
