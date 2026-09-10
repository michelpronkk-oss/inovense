"use client";

import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { SearchIcon } from "@/components/dashboard/icons";
import { getEntitlements } from "@/lib/os/entitlements";
import { PageHeader } from "@/components/product-ui/page-primitives";

const TYPE_TONE: Record<string, string> = {
  client: "cyan",
  brand: "plan",
  process: "muted",
  market: "amber",
  product: "green",
  agent: "red",
};

const CONTEXT_FIELDS = ["Workspace", "Industry", "Team size", "Website", "First priority", "Relevant systems", "Source"];

function contextFields(content: string): Array<{ label: string; value: string }> {
  const expression = new RegExp(`(${CONTEXT_FIELDS.join("|")}):\\s*(.*?)(?=\\s+(?:${CONTEXT_FIELDS.join("|")}):|$)`, "gi");
  const fields: Array<{ label: string; value: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = expression.exec(content)) !== null) {
    fields.push({ label: match[1], value: match[2].trim().replace(/[.]$/, "") });
  }
  return fields;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function MemoryPage() {
  const { state } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview";
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const entries = useMemo(() => state.memory, [state.memory]);

  const totalFields = entries.reduce((sum, e) => sum + e.fieldCount, 0);
  const mostRecent = entries.length
    ? entries.reduce((latest, e) => new Date(e.updatedAt) > new Date(latest.updatedAt) ? e : latest, entries[0])
    : undefined;

  const filtered = entries.filter(
    (e) => !q ||
      e.label.toLowerCase().includes(q.toLowerCase()) ||
      e.content.toLowerCase().includes(q.toLowerCase()) ||
      e.tags.some((t) => t.includes(q.toLowerCase()))
  );
  const visibleEntries = filtered.slice(0, visibleCount);
  const expandedEntry = expanded ? entries.find((e) => e.id === expanded) : undefined;
  const expandedFields = expandedEntry ? contextFields(expandedEntry.content) : [];

  return (
    <div className="os-page memory-page">
      <PageHeader
        eyebrow="Business context"
        title="Memory"
        description="What Auterim knows about your business. Operators use this context before they act."
      />
      <p className="t-meta" style={{ marginTop: -6 }}>
        {isPreview ? "Your owner-confirmed brief is ready. Connected systems and approved work can enrich it after activation." : "Connected systems and approved work enrich this context over time."}
      </p>

      <section className="sec panel card-pad" aria-label="Workspace facts">
        <div className="grid4">
          <div><span className="t-eyebrow">Workspace</span><div className="t-object">{state.workspace.name}</div></div>
          <div><span className="t-eyebrow">Industry</span><div className="t-object">{state.onboarding.industry || "Not provided"}</div></div>
          <div><span className="t-eyebrow">Team size</span><div className="t-object">{state.onboarding.companySize || "Not provided"}</div></div>
          <div><span className="t-eyebrow">Website</span><div className="t-object">{state.onboarding.websiteUrl || "Not provided"}</div></div>
        </div>
      </section>

      <section className="sec card memory-index">
        <div className="card-head">
          <div>
            <h3 className="t-section">Memory index</h3>
            <p className="t-meta" style={{ margin: "3px 0 0" }}>
              {visibleEntries.length} of {filtered.length} entries · {totalFields} structured fields · Last updated {mostRecent ? relativeTime(mostRecent.updatedAt) : "not yet"}
            </p>
          </div>
          <div className="search" style={{ minWidth: 240 }}>
            <SearchIcon size={15} aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setVisibleCount(5); }}
              placeholder="Search memory, tags, or content…"
              aria-label="Search memory"
            />
            {q && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ("")}>Clear</button>}
          </div>
        </div>
        <div className="rows">
          {visibleEntries.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <div
                key={e.id}
                className={`row link${isOpen ? " is-open" : ""}`}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Close" : "Open"} ${e.label}`}
                onClick={() => setExpanded(isOpen ? null : e.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpanded(isOpen ? null : e.id); } }}
              >
                <span className="grow">
                  <span className="ttl">{e.label}</span>
                  <span className="sub">{e.summary} · {e.fieldCount} fields</span>
                </span>
                <span className="rt">
                  <span className="t-meta">{relativeTime(e.updatedAt)}</span>
                  <span className={`badge ${TYPE_TONE[e.type] ?? "cyan"}`}>{e.type}</span>
                  <span className="memory-entry-chevron" aria-hidden="true" />
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="row"><span className="grow t-meta">No entries match your search.</span></div>
          )}
        </div>
        {visibleEntries.length < filtered.length && (
          <div className="card-pad" style={{ paddingTop: 12, paddingBottom: 12, borderTop: "1px solid var(--line)" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setVisibleCount((count) => count + 5)}>Show 5 more</button>
          </div>
        )}
      </section>

      {expandedEntry && (
        <section className="sec card memory-expanded-entry">
          <div className="card-head">
            <div>
              <h3 className="t-section">{expandedEntry.label}</h3>
              <p className="t-meta" style={{ margin: "3px 0 0" }}>{expandedEntry.summary}</p>
            </div>
            <span className={`badge ${TYPE_TONE[expandedEntry.type] ?? "cyan"}`}>{expandedEntry.type}</span>
          </div>
          <div className="card-pad">
            {expandedFields.length > 0 ? (
              <dl className="memory-definition-grid">
                {expandedFields.map((field) => (
                  <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>
                ))}
              </dl>
            ) : (
              <p className="t-compact dim">{expandedEntry.content}</p>
            )}
            <p className="t-meta" style={{ marginTop: 16 }}>Workspace context · Available to approved operators</p>
          </div>
        </section>
      )}
    </div>
  );
}
