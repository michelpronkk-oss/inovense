"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { SearchIcon } from "@/components/dashboard/icons";
import { getEntitlements } from "@/lib/os/entitlements";
import { PageHeader } from "@/components/product-ui/page-primitives";
import { confirmMemoryEntryAction, correctMemoryEntryAction, markMemoryOutdatedAction } from "@/app/app/memory/actions";
import { memorySummary, resolveMemoryFacts } from "@/lib/memory/model";
import type { MemoryCategory, MemoryEntry } from "@/lib/os/types";

const RELIABILITY_TONE: Record<string, string> = { verified: "green", observed: "cyan", derived: "plan", stale: "amber", missing: "muted" };
const CATEGORY_LABELS: Record<MemoryCategory, string> = { business: "Business", commercial: "Commercial", customers: "Customers", delivery: "Delivery", support: "Support", operating_rules: "Operating rules" };
const CONTEXT_FIELDS = ["Workspace", "Industry", "Team size", "Website", "First priority", "Relevant systems", "Source"];

function contextFields(content: string): Array<{ label: string; value: string }> {
  const expression = new RegExp(`(${CONTEXT_FIELDS.join("|")}):\\s*(.*?)(?=\\s+(?:${CONTEXT_FIELDS.join("|")}):|$)`, "gi");
  const fields: Array<{ label: string; value: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = expression.exec(content)) !== null) fields.push({ label: match[1], value: match[2].trim().replace(/[.]$/, "") });
  return fields;
}

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function reliabilityLabel(entry: MemoryEntry) {
  return entry.reliability === "verified" ? "Verified" : entry.reliability === "observed" ? "Observed" : entry.reliability === "derived" ? "Derived" : entry.reliability === "stale" ? "Stale" : "Missing";
}

function sourceLabel(entry: MemoryEntry) {
  if (entry.sourceConnector) return `${entry.sourceLabel ?? "Connected system"} · ${entry.sourceConnector}`;
  return entry.sourceLabel ?? "Source not recorded";
}

export default function MemoryPage() {
  const { state, refreshWorkspace } = useOS();
  const router = useRouter();
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview";
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<MemoryCategory | "all">("all");
  const [reliability, setReliability] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allEntries = useMemo(() => state.memory, [state.memory]);
  const resolvedFacts = useMemo(() => resolveMemoryFacts(allEntries), [allEntries]);
  const entries = useMemo(() => resolvedFacts.flatMap((fact) => fact.effective ? [fact.effective] : []), [resolvedFacts]);
  const summary = memorySummary(entries);
  const connectedSystems = state.connectors.filter((connector) => connector.isConnected).map((connector) => connector.name);
  const canManageContext = /owner|admin/i.test(state.currentUser.roleLabel);
  const normalizedQuery = q.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    const matchesQuery = !normalizedQuery || [entry.label, entry.summary, entry.content, entry.sourceLabel, ...entry.tags, ...(entry.operatorRelevance ?? [])].some((value) => value?.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (category === "all" || entry.category === category) && (reliability === "all" || entry.reliability === reliability);
  });
  const visibleEntries = filtered.slice(0, visibleCount);
  const expandedEntry = expanded ? entries.find((entry) => entry.id === expanded) : undefined;
  const expandedHistory = expandedEntry ? resolvedFacts.find((fact) => fact.canonicalKey === (expandedEntry.canonicalKey ?? expandedEntry.id))?.alternates.filter((entry) => entry.id !== expandedEntry.id).slice(0, 4) ?? [] : [];
  const expandedFields = expandedEntry ? contextFields(expandedEntry.content) : [];
  const totalFields = entries.reduce((sum, entry) => sum + entry.fieldCount, 0);

  const mutate = (action: "confirm" | "stale" | "correct", id: string) => {
    startTransition(async () => {
      const result = action === "confirm" ? await confirmMemoryEntryAction(id) : action === "stale" ? await markMemoryOutdatedAction(id) : await correctMemoryEntryAction(id, window.prompt("Enter the corrected context value") ?? "", window.prompt("Why is this correction needed?") ?? undefined);
      if (!result.ok) { setNotice(result.error); return; }
      setNotice(action === "confirm" ? "Context confirmed for approved operators." : action === "stale" ? "Context marked outdated. Operators will not treat it as fresh." : "Correction saved as a verified replacement.");
      await refreshWorkspace();
      router.refresh();
    });
  };

  return (
    <div className="os-page memory-page">
      <PageHeader eyebrow="Business context" title="Memory" description="What Auterim knows about your business. Operators reference this context before they act." />
      <p className="memory-enrichment-note">{isPreview ? "Your owner-confirmed brief is ready. Connected systems and approved work can enrich it after activation." : "Connected systems and approved work enrich this context over time."}</p>

      <section className="memory-summary-rail" aria-label="Memory summary">
        <div><span>Verified context</span><strong>{summary.verified}</strong><small>Owner-confirmed facts</small></div>
        <div><span>Observed context</span><strong>{summary.observed}</strong><small>Connected-system evidence</small></div>
        <div><span>Derived context</span><strong>{summary.derived}</strong><small>Evidence-backed operator learnings</small></div>
        <aside><span className="dot" data-tone={summary.attention ? "amber" : "green"} /> <span><strong>{summary.attention}</strong> {summary.attention === 1 ? "item needs" : "items need"} attention through confirmation, freshness, or conflict review.</span></aside>
      </section>

      <section className="sec panel card-pad memory-profile" aria-label="Business profile">
        <div className="card-head"><div><h3 className="t-section">Business profile</h3><p className="t-meta">The compact owner-confirmed context operators can safely start from.</p></div><span className="badge cyan">{connectedSystems.length} connected</span></div>
        <dl className="memory-profile-grid">
          <div><dt>Workspace</dt><dd>{state.workspace.name}</dd></div><div><dt>Industry</dt><dd>{state.onboarding.industry || "Not provided"}</dd></div><div><dt>Team size</dt><dd>{state.onboarding.companySize || "Not provided"}</dd></div><div><dt>Website</dt><dd>{state.onboarding.websiteUrl || "Not provided"}</dd></div><div><dt>First priority</dt><dd>{state.onboarding.preferredOperator || "Not provided"}</dd></div><div><dt>Connected systems</dt><dd>{connectedSystems.length ? connectedSystems.join(", ") : "None connected yet"}</dd></div>
        </dl>
      </section>

      <section className="sec card memory-index" aria-label="Governed business context">
        <div className="card-head memory-index-head"><div><h3 className="t-section">Governed context</h3><p className="t-meta" style={{ margin: "3px 0 0" }}>{visibleEntries.length} of {filtered.length} entries · {totalFields} structured fields · source, reliability, and freshness stay attached.</p></div><div className="memory-controls"><label className="memory-search"><SearchIcon size={15} aria-hidden="true" /><input value={q} onChange={(event) => { setQ(event.target.value); setVisibleCount(8); }} placeholder="Search context…" aria-label="Search memory" />{q && <button type="button" onClick={() => setQ("")}>Clear</button>}</label><select value={category} onChange={(event) => { setCategory(event.target.value as MemoryCategory | "all"); setVisibleCount(8); }} aria-label="Filter by category"><option value="all">All categories</option>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={reliability} onChange={(event) => { setReliability(event.target.value); setVisibleCount(8); }} aria-label="Filter by reliability"><option value="all">All trust levels</option><option value="verified">Verified</option><option value="observed">Observed</option><option value="derived">Derived</option><option value="stale">Stale</option></select></div></div>
        <div className="rows">
          {visibleEntries.map((entry) => {
            const isOpen = expanded === entry.id;
            const operators = entry.operatorRelevance?.length ? entry.operatorRelevance.join(", ") : "Approved operators";
            return <div key={entry.id} className={`memory-index-row${isOpen ? " is-open" : ""}`}><div className="row link memory-index-trigger" role="button" tabIndex={0} aria-expanded={isOpen} aria-label={`${isOpen ? "Close" : "Open"} ${entry.label}`} onClick={() => setExpanded(isOpen ? null : entry.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpanded(isOpen ? null : entry.id); } }}><span className="grow"><span className="ttl">{entry.label}</span><span className="sub">{entry.summary} · {CATEGORY_LABELS[entry.category ?? "operating_rules"]} · used by {operators}</span></span><span className="memory-entry-meta"><span className={`badge ${RELIABILITY_TONE[entry.reliability ?? "missing"] ?? "muted"}`}>{reliabilityLabel(entry)}</span><span className="t-meta">{relativeTime(entry.updatedAt)}</span><span className="memory-entry-chevron" aria-hidden="true" /></span></div>{isOpen && <div className="memory-index-detail card-pad"><div className="memory-detail-top"><div><span className="t-eyebrow">{CATEGORY_LABELS[entry.category ?? "operating_rules"]}</span><p className="t-compact">{entry.content}</p></div><div className="memory-detail-actions">{canManageContext && entry.sourceType !== "connector_observed" && entry.reliability !== "verified" && <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={(event) => { event.stopPropagation(); mutate("confirm", entry.id); }}>Confirm</button>}{canManageContext && entry.reliability !== "stale" && <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={(event) => { event.stopPropagation(); mutate("stale", entry.id); }}>Mark outdated</button>}</div></div><dl className="memory-definition-grid"><div><dt>Source</dt><dd>{sourceLabel(entry)}</dd></div><div><dt>Reliability</dt><dd>{reliabilityLabel(entry)}{entry.confidence ? ` · ${entry.confidence} confidence` : ""}</dd></div><div><dt>Freshness</dt><dd>{entry.freshness === "fresh" ? "Fresh" : entry.freshness === "stale" ? "Stale" : "Not timed"}{entry.staleAfter ? ` · review ${relativeTime(entry.staleAfter)}` : ""}</dd></div><div><dt>Operators</dt><dd>{operators}</dd></div><div><dt>Evidence</dt><dd>{entry.evidence?.length ? entry.evidence.join(", ") : "Source record retained"}</dd></div><div><dt>Canonical key</dt><dd>{entry.canonicalKey ?? entry.id}</dd></div></dl>{entry.conflict && <p className="memory-attention-note"><span className="dot" data-tone="amber" /> Conflicting evidence is preserved. The higher-ranked fresh source is used for decisions; owner review is required before this item is treated as settled.</p>}{expandedFields.length > 0 && <dl className="memory-definition-grid memory-content-fields">{expandedFields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>}<p className="t-meta memory-index-reference">Workspace-scoped context · provider records remain authoritative for live transaction state.</p></div>}</div>;
          })}
          {filtered.length === 0 && <div className="row memory-index-empty"><span className="grow t-meta">No context matches these filters. Missing context stays visible in the business profile instead of being guessed.</span></div>}
        </div>
        {visibleEntries.length < filtered.length && <div className="card-pad memory-more"><button className="btn btn-ghost btn-sm" onClick={() => setVisibleCount((count) => count + 8)}>Show more context</button></div>}
      </section>
      {expandedEntry && expandedHistory.length > 0 && <section className="sec panel card-pad memory-history-panel" aria-label="Memory history"><div className="card-head"><div><h3 className="t-section">Previous values</h3><p className="t-meta">Historical evidence remains available without changing the current effective context.</p></div><span className="badge muted">{expandedHistory.length} retained</span></div><div className="rows">{expandedHistory.map((entry) => <div className="row" key={entry.id}><span className="grow"><span className="ttl">{entry.content}</span><span className="sub">{sourceLabel(entry)} · {relativeTime(entry.updatedAt)}</span></span><span className={`badge ${RELIABILITY_TONE[entry.reliability ?? "missing"] ?? "muted"}`}>{reliabilityLabel(entry)}</span></div>)}</div></section>}
       {expandedEntry && canManageContext && <div className="memory-correction-action"><button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => mutate("correct", expandedEntry.id)}>Correct selected context</button></div>}
       {notice && <p className="memory-action-notice" role="status">{notice}</p>}
    </div>
  );
}
