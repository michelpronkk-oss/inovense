"use client";

import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { DatabaseIcon, SearchIcon } from "@/components/dashboard/icons";
import { getEntitlements } from "@/lib/os/entitlements";

const TYPE_COLORS: Record<string, string> = {
  client: "#4DE8E1",
  brand: "#A78BFA",
  process: "#5B8DEF",
  market: "#F5C26B",
  product: "#51D88A",
  agent: "#F2767C",
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

  return (
    <div className="os-page memory-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Business context</span>
          <h1>Memory</h1>
          <div className="os-page-sub">Structured business context operators can safely reference.</div>
          <div className="memory-enrichment-note">{isPreview ? "Your owner-confirmed brief is ready. Connected systems and approved work can enrich it after activation." : "Connected systems and approved work enrich this context over time."}</div>
        </div>
      </div>

      <section className="memory-summary-rail" aria-label="Memory summary">
        {/* Two metrics that carry real weight. Category count is genuine but
            sparse (typically three or four), so it rides along as detail
            rather than claiming an equal-sized slot next to them. */}
        <div><span>Entries</span><strong>{entries.length}</strong><small>{totalFields} structured fields · {new Set(entries.map((e) => e.type)).size} categories</small></div>
        <div><span>Last updated</span><strong>{mostRecent ? relativeTime(mostRecent.updatedAt) : "Not yet"}</strong><small>{mostRecent?.label ?? "Awaiting workspace context"}</small></div>
        <aside><span className="dot dot-cyan" /> References appear after operators safely use memory in live work.</aside>
      </section>

      <div className="memory-search">
        <SearchIcon size={15} aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setVisibleCount(5); }}
          placeholder="Search memory, tags, or content…"
          aria-label="Search memory"
        />
        {q && <button type="button" onClick={() => setQ("")}>Clear</button>}
      </div>

      <div className="p memory-index">
        <div className="p-head">
          <h3><DatabaseIcon size={13} /> Memory index</h3>
          <div className="p-meta">{visibleEntries.length} of {filtered.length} entries</div>
        </div>
        {visibleEntries.map((e) => {
          const color = TYPE_COLORS[e.type] ?? "#4DE8E1";
          const isOpen = expanded === e.id;
          const fields = contextFields(e.content);
          return (
            <div key={e.id} className={`memory-index-row${isOpen ? " is-open" : ""}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Close" : "Open"} ${e.label}`}
                className="memory-index-trigger"
                style={{ width: "100%", textAlign: "left", padding: "13px 16px", background: isOpen ? "rgba(255,255,255,0.014)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 11 }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}10`, boxShadow: `inset 0 0 0 1px ${color}30`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <DatabaseIcon size={12} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 560, letterSpacing: "-0.01em", color: "var(--text)" }}>{e.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, padding: "2px 5px", borderRadius: 4, background: `${color}12`, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.type}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.summary} <span style={{ color: "var(--text-faint)" }}>· {e.fieldCount} fields · {relativeTime(e.updatedAt)}</span></div>
                </div>
                <div className="memory-entry-tags">
                  {e.tags.slice(0, 2).map((t) => (
                    <span key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                <span className="memory-entry-chevron" aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="memory-index-detail" style={{ padding: "0 16px 15px 55px" }}>
                  {fields.length > 0 ? (
                    <dl className="memory-definition-grid">
                      {fields.map((field) => (
                        <div key={field.label}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.018)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6 }}>{e.content}</div>
                  )}
                  <div style={{ color: "var(--text-faint)", fontSize: 10.5, marginTop: 9 }}>Owner-confirmed context · Available to approved operators</div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>No entries match your search.</div>
        )}
        {visibleEntries.length < filtered.length && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line)" }}>
            <button className="appr-btn edit" onClick={() => setVisibleCount((count) => count + 5)}>Show 5 more</button>
          </div>
        )}
      </div>
    </div>
  );
}
