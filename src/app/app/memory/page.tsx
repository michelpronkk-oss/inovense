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
  const mostRecent = entries.reduce((latest, e) =>
    new Date(e.updatedAt) > new Date(latest.updatedAt) ? e : latest, entries[0]);

  const filtered = entries.filter(
    (e) => !q ||
      e.label.toLowerCase().includes(q.toLowerCase()) ||
      e.content.toLowerCase().includes(q.toLowerCase()) ||
      e.tags.some((t) => t.includes(q.toLowerCase()))
  );
  const visibleEntries = filtered.slice(0, visibleCount);

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Business context - {entries.length} entries</span>
          <h1>Memory</h1>
          <div className="os-page-sub">Structured business knowledge that operators reference during execution. Clients, brand voice, processes, market intelligence.</div>
          <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
            {isPreview ? "Your owner-confirmed brief is available now. Connected systems and approved operator outputs enrich memory when you activate." : "Memory is enriched from connected systems and approved operator outputs."}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total entries", val: String(entries.length), sub: `${totalFields} total fields` },
          { label: "Categories", val: String(new Set(entries.map((e) => e.type)).size), sub: "client, brand, process..." },
          { label: "Referenced (7d)", val: "-", sub: "Available after first operator run" },
          { label: "Last updated", val: mostRecent ? relativeTime(mostRecent.updatedAt) : "-", sub: mostRecent?.label ?? "" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, boxShadow: "inset 0 0 0 1px var(--line)" }}>
        <SearchIcon size={14} style={{ color: "var(--text-mute)", flexShrink: 0 }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setVisibleCount(5); }}
          placeholder="Search memory entries, tags, content..."
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 13.5 }}
        />
        {q && <button onClick={() => setQ("")} style={{ color: "var(--text-mute)", background: "none", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)" }}>clear</button>}
      </div>

      <div className="p">
        <div className="p-head">
          <h3><DatabaseIcon size={13} /> Memory index</h3>
          <div className="p-meta">{visibleEntries.length} of {filtered.length} entries</div>
        </div>
        {visibleEntries.map((e) => {
          const color = TYPE_COLORS[e.type] ?? "#4DE8E1";
          const isOpen = expanded === e.id;
          return (
            <div key={e.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                style={{ width: "100%", textAlign: "left", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}15`, boxShadow: `inset 0 0 0 1px ${color}40`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <DatabaseIcon size={13} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{e.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: `${color}15`, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{e.type}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{e.summary} - {e.fieldCount} fields - updated {relativeTime(e.updatedAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {e.tags.map((t) => (
                    <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "var(--text-mute)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div style={{ color: "var(--text-faint)", marginLeft: 8, fontSize: 18, fontWeight: 300, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>&gt;</div>
              </button>
              {isOpen && (
                <div style={{ padding: "0 18px 16px 62px" }}>
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 10 }}>
                    {e.content}
                  </div>
                  <div style={{ color: "var(--text-mute)", fontSize: 11.5 }}>
                    Provenance is preserved. Context is added from onboarding, connected sources, and approved operator outputs.
                  </div>
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
