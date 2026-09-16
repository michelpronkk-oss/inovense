"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { SearchIcon } from "@/components/dashboard/icons";
import { getEntitlements } from "@/lib/os/entitlements";
import { FreshnessIndicator, PageHeader } from "@/components/product-ui/page-primitives";
import { confirmMemoryEntryAction, correctMemoryEntryAction, markMemoryOutdatedAction } from "@/app/app/memory/actions";
import { memorySummary, resolveMemoryFacts } from "@/lib/memory/model";
import type { MemoryCategory, MemoryEntry } from "@/lib/os/types";
import { getRealConnectedConnectors } from "@/lib/os/truth";
import { useWorkspaceRealtimeInvalidation, useWorkspaceRealtimeStatus } from "@/lib/os/workspace-realtime";
import { formatRelativeWorkspaceTime } from "@/lib/product/time";

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
  return formatRelativeWorkspaceTime(iso);
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
  const realtimeStatus = useWorkspaceRealtimeStatus(state.workspace.id);
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
  const connectedSystems = getRealConnectedConnectors(state.connectors).map((connector) => connector.name);
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
  const lastUpdatedAt = entries.map((entry) => entry.updatedAt).filter((value) => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

  useWorkspaceRealtimeInvalidation(state.workspace.id, ["memory", "connectors"], () => {
    void refreshWorkspace().catch(() => setNotice("Context refresh is temporarily unavailable. The visible data remains the last persisted workspace snapshot."));
  });

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
      <PageHeader eyebrow="Business context" title="Memory" description="The trusted context Auterim uses to understand your business and prepare the right work." meta={<FreshnessIndicator updatedAt={lastUpdatedAt} realtimeStatus={realtimeStatus} />} />
      <p className="memory-summary-caption">{isPreview ? "Your owner-confirmed brief is ready below. Connected systems and approved work will keep enriching it after activation." : "Connected systems and approved work enrich this context over time."}</p>

      <section className="memory-summary-rail" aria-label="Memory summary">
        <div><span>Verified context</span><strong>{summary.verified}</strong><small>Owner-confirmed facts</small></div>
        <div><span>Observed context</span><strong>{summary.observed}</strong><small>Connected-system evidence</small></div>
        <div><span>Derived context</span><strong>{summary.derived}</strong><small>Evidence-backed operator learnings</small></div>
        <div className="memory-summary-attention" data-tone={summary.attention ? "amber" : "green"}>
          <span><span className="dot" aria-hidden="true" />Needs attention</span>
          <strong>{summary.attention}</strong>
          <small>{summary.attention ? "Confirmation, freshness, or conflict review" : "Nothing needs review right now"}</small>
        </div>
      </section>

      <section className="sec panel card-pad memory-profile" aria-label="Business profile">
        <div className="card-head"><div><h3 className="t-section">Business profile</h3><p className="t-meta">The stable facts that guide every operator.</p></div><span className="badge cyan">{connectedSystems.length} connected</span></div>
        <dl className="memory-profile-grid">
          {[
            { label: "Workspace", value: state.workspace.name, provided: true },
            { label: "Industry", value: state.onboarding.industry || "Not provided", provided: Boolean(state.onboarding.industry) },
            { label: "Team size", value: state.onboarding.companySize || "Not provided", provided: Boolean(state.onboarding.companySize) },
            { label: "Website", value: state.onboarding.websiteUrl || "Not provided", provided: Boolean(state.onboarding.websiteUrl) },
            { label: "First priority", value: state.onboarding.preferredOperator || "Not provided", provided: Boolean(state.onboarding.preferredOperator) },
            { label: "Connected systems", value: connectedSystems.length ? connectedSystems.join(", ") : "None connected yet", provided: connectedSystems.length > 0 },
          ].map((field) => <div key={field.label}><dt>{field.label}</dt><dd data-empty={field.provided ? undefined : true}>{field.value}</dd></div>)}
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
