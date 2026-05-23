"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { TEMPLATE_LIST } from "@/lib/os/templates";
import type { DeployConfig } from "@/lib/os/types";
import { SearchIcon, SparkIcon, BellIcon, MessageIcon, PlusIcon, XIcon, ArrowIcon, CpuIcon, FlowIcon, DocIcon, DatabaseIcon } from "@/components/dashboard/icons";

const PAGE_LABELS: Record<string, string> = {
  "/app": "Overview",
  "/app/agents": "Agents",
  "/app/workflows": "Workflows",
  "/app/approvals": "Approvals",
  "/app/memory": "Memory",
  "/app/connectors": "Connectors",
  "/app/logs": "Execution logs",
  "/app/insights": "Insights",
  "/app/team": "Team",
  "/app/policies": "Policies",
  "/app/api-keys": "API keys",
  "/app/settings": "Settings",
};

// ── Deploy modal ───────────────────────────────────────────────────────────

function DeployModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [tools, setTools] = useState("");
  const [approvalPolicy, setApprovalPolicy] = useState("require_approval");
  const router = useRouter();
  const { state, deployAgent, runAgent } = useOS();

  // Which template IDs already have at least one deployed instance
  const deployedIds = new Set(state.agents.map((a) => a.templateId));

  const selectedTemplate = TEMPLATE_LIST.find((t) => t.id === selected);

  const filteredTemplates = TEMPLATE_LIST.filter((t) =>
    !searchQ ||
    t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.tag.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleLaunch = () => {
    if (!selected || !selectedTemplate) return;
    const customName = operatorName.trim();
    const config: DeployConfig = {
      templateId: selected,
      name: customName || selectedTemplate.name,
      tools,
      workflow,
      approvalPolicy,
    };
    const agent = deployAgent(config);
    setTimeout(() => runAgent(agent.id), 200);
    onClose();
    router.push("/app/agents");
  };

  const deployedCount = deployedIds.has(selected ?? "") ? state.agents.filter((a) => a.templateId === selected).length : 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "linear-gradient(180deg, #0E1218 0%, #09090D 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07), 0 48px 96px rgba(0,0,0,0.7)",
        borderRadius: 22,
        width: "100%", maxWidth: step === 0 ? 680 : 520,
        transition: "max-width 0.25s ease",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "28px 28px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 6, opacity: 0.8 }}>
                {step === 0 ? "Step 1 of 3 - Select operator" : step === 1 ? "Step 2 of 3 - Configure" : "Step 3 of 3 - Deploy"}
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.2 }}>
                {step === 0 ? "Deploy an operator" : step === 1 ? "Configure your operator" : "Ready to launch"}
              </div>
              {step === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--text-mute)", marginTop: 5 }}>
                  {TEMPLATE_LIST.length} operator types available. Each can be deployed multiple times with different names, tools, and policies.
                </div>
              )}
            </div>
            <button onClick={onClose} className="os-iconbtn" style={{ flexShrink: 0, marginLeft: 16 }}><XIcon size={14} /></button>
          </div>

          {step === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 9, boxShadow: "inset 0 0 0 1px var(--line)", marginBottom: 16 }}>
              <SearchIcon size={13} style={{ color: "var(--text-mute)", flexShrink: 0 }} />
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search operators..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 13 }}
              />
              {searchQ && (
                <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 10, fontFamily: "var(--font-mono)" }}>clear</button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: step === 0 ? "0 28px" : "0 28px" }}>
          {step === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, paddingBottom: 24 }}>
              {filteredTemplates.map((t) => {
                const isSelected = selected === t.id;
                const isDeployed = deployedIds.has(t.id);
                const instanceCount = state.agents.filter((a) => a.templateId === t.id).length;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    style={{
                      textAlign: "left", padding: "14px 14px 12px", borderRadius: 12,
                      background: isSelected ? `${t.color}0D` : "rgba(255,255,255,0.018)",
                      boxShadow: isSelected ? `inset 0 0 0 1.5px ${t.color}60` : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                      cursor: "pointer", border: "none", color: "inherit",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        display: "grid", placeItems: "center",
                        fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700,
                        color: t.color,
                        background: `linear-gradient(135deg, ${t.color}22, ${t.color}06)`,
                        boxShadow: `inset 0 0 0 1px ${t.color}44`,
                      }}>{t.mark}</div>
                      {isDeployed && (
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px",
                          borderRadius: 4, background: "rgba(255,255,255,0.04)",
                          color: "var(--text-faint)", boxShadow: "inset 0 0 0 1px var(--line)",
                          letterSpacing: "0.04em",
                        }}>
                          {instanceCount} running
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: t.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em", opacity: 0.8 }}>{t.tag}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-mute)", lineHeight: 1.5 }}>{t.description}</div>
                  </button>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div style={{ gridColumn: "1 / -1", padding: "32px 0", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
                  No operators match your search.
                </div>
              )}
            </div>
          )}

          {step === 1 && selectedTemplate && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
              {/* Selected type summary */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: `${selectedTemplate.color}08`, boxShadow: `inset 0 0 0 1px ${selectedTemplate.color}30`, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: selectedTemplate.color, background: `${selectedTemplate.color}20`, boxShadow: `inset 0 0 0 1px ${selectedTemplate.color}44`, flexShrink: 0 }}>
                  {selectedTemplate.mark}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedTemplate.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{selectedTemplate.tag}</div>
                </div>
                {deployedCount > 0 && (
                  <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
                    {deployedCount} already running
                  </div>
                )}
              </div>

              {[
                {
                  label: "Operator name",
                  placeholder: deployedCount > 0 ? `${selectedTemplate.name} v${deployedCount + 1}` : selectedTemplate.name,
                  hint: "Give this instance a unique name to distinguish it from others.",
                  value: operatorName,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setOperatorName(e.target.value),
                },
                {
                  label: "Primary workflow",
                  placeholder: "Select workflow or create new...",
                  hint: null,
                  value: workflow,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setWorkflow(e.target.value),
                },
                {
                  label: "Tools and integrations",
                  placeholder: selectedTemplate.allowedTools.map((t) => t.split(" ")[0]).join(", "),
                  hint: "Default tools shown. Adjust scope as needed.",
                  value: tools,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTools(e.target.value),
                },
                {
                  label: "Approval policy",
                  placeholder: "require_approval",
                  hint: "require_approval, allow, or block.",
                  value: approvalPolicy,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setApprovalPolicy(e.target.value),
                },
              ].map((f) => (
                <div key={f.label}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-mute)" }}>{f.label}</div>
                    {f.hint && <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{f.hint}</div>}
                  </div>
                  <input
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={f.onChange}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.03)", border: "none",
                      boxShadow: "inset 0 0 0 1px var(--line)", borderRadius: 9,
                      padding: "10px 14px", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 13,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && selectedTemplate && (
            <div style={{ paddingBottom: 24 }}>
              <div style={{
                padding: "16px 18px", borderRadius: 12, marginBottom: 16,
                background: "rgba(77,232,225,0.05)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span className="dot dot-cyan pulsing" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Operator ready</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
                  {operatorName || selectedTemplate.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
                  {selectedTemplate.tag} - production workspace
                </div>
              </div>

              {[
                { label: "Approval gate", val: "All outbound actions require approval" },
                { label: "Memory access", val: selectedTemplate.allowedTools.includes("Memory (read)") || selectedTemplate.allowedTools.some((t) => t.startsWith("Memory")) ? "Read + write context" : "No memory access" },
                { label: "Tools", val: selectedTemplate.allowedTools.map((t) => t.split(" ")[0]).slice(0, 4).join(", ") },
                { label: "Blocked actions", val: selectedTemplate.blockedActions.slice(0, 3).join(", ") || "None additional" },
              ].map((row) => (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", paddingTop: 1 }}>{row.label}</span>
                  <span style={{ color: "var(--text-dim)" }}>{row.val}</span>
                </div>
              ))}

              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12, color: "var(--text-faint)", lineHeight: 1.55 }}>
                The operator will start immediately, run its first task, and appear in your Agents list within seconds.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          {step > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          <button
            className="btn btn-primary btn-sm"
            disabled={step === 0 && !selected}
            style={{ opacity: step === 0 && !selected ? 0.38 : 1, cursor: step === 0 && !selected ? "not-allowed" : "pointer" }}
            onClick={() => step < 2 ? setStep(s => s + 1) : handleLaunch()}
          >
            {step === 0 ? <>Select and continue <ArrowIcon size={12} /></> : step === 1 ? <>Review <ArrowIcon size={12} /></> : "Launch operator"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Command palette ────────────────────────────────────────────────────────

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const { state } = useOS();

  const items = [
    ...state.agents.map((a) => ({
      icon: CpuIcon,
      label: a.name,
      sub: `${a.status} - ${a.stats.metricValue} ${a.stats.metricLabel}`,
      href: "/app/agents",
    })),
    ...state.workflows.map((w) => ({
      icon: FlowIcon,
      label: w.name,
      sub: `${w.trigger} - ${w.totalRuns.toLocaleString()} runs`,
      href: "/app/workflows",
    })),
    ...state.approvals.filter((a) => a.status === "pending").map((a) => ({
      icon: DocIcon,
      label: a.title,
      sub: `${a.type} - pending approval`,
      href: "/app/approvals",
    })),
    ...state.memory.map((m) => ({
      icon: DatabaseIcon,
      label: m.label,
      sub: `${m.type} - ${m.fieldCount} fields`,
      href: "/app/memory",
    })),
  ];

  const filtered = items.filter(
    (it) => !q || it.label.toLowerCase().includes(q.toLowerCase()) || it.sub.toLowerCase().includes(q.toLowerCase())
  );

  const go = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIdx(i => Math.min(i + 1, filtered.length - 1));
      if (e.key === "ArrowUp") setIdx(i => Math.max(i - 1, 0));
      if (e.key === "Enter" && filtered[idx]) go(filtered[idx].href);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [filtered, idx, go, onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "18vh",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "linear-gradient(180deg, #0E1218, #0A0D12)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.7)",
        borderRadius: 16, width: "100%", maxWidth: 520, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <SearchIcon size={15} style={{ color: "var(--text-mute)", flexShrink: 0 }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            placeholder="Search agents, workflows, memory, approvals..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 14,
            }}
          />
          <button onClick={onClose} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", background: "rgba(255,255,255,0.04)", border: "none", padding: "3px 7px", borderRadius: 5, cursor: "pointer" }}>
            esc
          </button>
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>No results</div>
          )}
          {filtered.map((it, i) => {
            const Icon = it.icon;
            return (
              <button
                key={`${it.label}-${i}`}
                onClick={() => go(it.href)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 16px", border: "none",
                  background: i === idx ? "rgba(77,232,225,0.06)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
                onMouseEnter={() => setIdx(i)}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon size={13} style={{ color: i === idx ? "var(--cyan)" : "var(--text-dim)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{it.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{it.sub}</div>
                </div>
                <ArrowIcon size={12} style={{ color: "var(--text-faint)", marginLeft: "auto" }} />
              </button>
            );
          })}
        </div>
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 16 }}>
          {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([k, v]) => (
            <span key={v} style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>
              <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>{k}</span> {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared popover shell ───────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onClose]);
}

function Popover({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
      width: 320,
      background: "linear-gradient(180deg, #0E1318 0%, #090C10 100%)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07), 0 24px 56px rgba(0,0,0,0.65)",
      borderRadius: 14,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── What's New panel ───────────────────────────────────────────────────────

const CHANGELOG = [
  {
    date: "May 2026",
    tag: "New",
    tagColor: "#4DE8E1",
    title: "Finance and Support operators",
    body: "Two new operator types available in the deploy catalog. Finance monitors invoices and flags overdue accounts. Support handles client queries and draft responses.",
  },
  {
    date: "May 2026",
    tag: "Improved",
    tagColor: "#A78BFA",
    title: "Deploy modal redesigned",
    body: "All 8 operator types are now searchable. Running instance counts are shown inline. Custom names and tool scopes can be set at deploy time.",
  },
  {
    date: "Apr 2026",
    tag: "New",
    tagColor: "#4DE8E1",
    title: "Policy engine live",
    body: "Every operator action is now checked against your workspace policies before execution. Global block, require-approval, and allow rules apply in priority order.",
  },
  {
    date: "Apr 2026",
    tag: "Improved",
    tagColor: "#A78BFA",
    title: "Approval flow wired end-to-end",
    body: "Approving or skipping an action now updates agent status, logs the outcome, and resets the operator in real time. State persists across sessions.",
  },
];

function WhatsNewPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <Popover style={{ width: 340 }}>
      <div ref={ref}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>What&apos;s new</div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>Inovense OS release notes</div>
          </div>
          <button onClick={onClose} className="os-iconbtn" style={{ width: 24, height: 24 }}><XIcon size={12} /></button>
        </div>
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {CHANGELOG.map((item, i) => (
            <div key={i} style={{ padding: "14px 18px", borderBottom: i < CHANGELOG.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px", borderRadius: 4,
                  background: `${item.tagColor}18`, color: item.tagColor,
                  boxShadow: `inset 0 0 0 1px ${item.tagColor}35`,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{item.tag}</span>
                <span style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{item.date}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: "var(--text)" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.55 }}>{item.body}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line)" }}>
          <button disabled aria-disabled="true" title="Full changelog is coming soon" style={{ fontSize: 12, color: "var(--cyan)", background: "none", border: "none", cursor: "not-allowed", padding: 0, fontFamily: "var(--font-sans)", opacity: 0.6 }}>
            View full changelog
          </button>
        </div>
      </div>
    </Popover>
  );
}

// ── Notifications panel ────────────────────────────────────────────────────

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { state, approveItem, skipItem } = useOS();
  useClickOutside(ref, onClose);

  const pending = state.approvals.filter((a) => a.status === "pending");
  const recentLogs = state.logs.filter((l) => l.status === "warn" || l.status === "error").slice(0, 3);
  const hasItems = pending.length > 0 || recentLogs.length > 0;

  const timeAgo = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <Popover style={{ width: 340 }}>
      <div ref={ref}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Notifications</div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
              {pending.length > 0 ? `${pending.length} pending approval${pending.length !== 1 ? "s" : ""}` : "All clear"}
            </div>
          </div>
          <button onClick={onClose} className="os-iconbtn" style={{ width: 24, height: 24 }}><XIcon size={12} /></button>
        </div>

        {!hasItems && (
          <div style={{ padding: "32px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 8, color: "var(--green)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ margin: "0 auto", display: "block" }}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>You&apos;re all caught up</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)" }}>No pending approvals or alerts.</div>
          </div>
        )}

        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {pending.length > 0 && (
            <div style={{ padding: "10px 18px 6px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-faint)", marginBottom: 8 }}>Awaiting approval</div>
              {pending.map((a) => (
                <div key={a.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `${a.agentColor}18`, boxShadow: `inset 0 0 0 1px ${a.agentColor}44`, display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 700, color: a.agentColor, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {a.agentMark}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", lineHeight: 1.3, marginBottom: 2 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{timeAgo(a.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => approveItem(a.id, a.runId, a.agentId)}
                      style={{ flex: 1, padding: "5px 0", borderRadius: 6, background: "rgba(77,232,225,0.1)", border: "none", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.3)", color: "var(--cyan)", fontSize: 11.5, fontFamily: "var(--font-sans)", cursor: "pointer", fontWeight: 500 }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => skipItem(a.id, a.runId, a.agentId)}
                      style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "none", boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--text-mute)", fontSize: 11.5, fontFamily: "var(--font-sans)", cursor: "pointer" }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentLogs.length > 0 && (
            <div style={{ padding: "6px 18px 12px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-faint)", marginBottom: 8 }}>Recent alerts</div>
              {recentLogs.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.status === "warn" ? "var(--amber)" : "var(--rose)", marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.4 }}>{l.message}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{l.agentMark} - {l.ts}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button disabled aria-disabled="true" title="Log deep-link is coming soon" style={{ fontSize: 12, color: "var(--cyan)", background: "none", border: "none", cursor: "not-allowed", padding: 0, fontFamily: "var(--font-sans)", opacity: 0.6 }}>
            View all in logs
          </button>
          {pending.length > 1 && (
            <button
              onClick={() => pending.forEach((a) => approveItem(a.id, a.runId, a.agentId))}
              style={{ fontSize: 11.5, color: "var(--text-mute)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}
            >
              Approve all
            </button>
          )}
        </div>
      </div>
    </Popover>
  );
}

// ── Help panel ─────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Command palette" },
  { keys: ["⌘", "D"], label: "Deploy agent" },
  { keys: ["↑", "↓"], label: "Navigate lists" },
  { keys: ["↵"], label: "Select / open" },
  { keys: ["Esc"], label: "Close panel" },
];

const HELP_LINKS = [
  { label: "Getting started", sub: "Deploy your first operator" },
  { label: "Policy engine", sub: "Approval rules and permissions" },
  { label: "Memory guide", sub: "Structured context for operators" },
  { label: "Connector setup", sub: "Integrate your tools" },
];

function HelpPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <Popover style={{ width: 300 }}>
      <div ref={ref}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Help</div>
          <button onClick={onClose} className="os-iconbtn" style={{ width: 24, height: 24 }}><XIcon size={12} /></button>
        </div>

        <div style={{ padding: "12px 18px 6px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-faint)", marginBottom: 10 }}>Keyboard shortcuts</div>
          {SHORTCUTS.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{s.label}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {s.keys.map((k) => (
                  <kbd key={k} style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, padding: "2px 6px", borderRadius: 5, background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--text-mute)" }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 18px 6px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-faint)", marginBottom: 10 }}>Documentation</div>
          {HELP_LINKS.map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "default" }}>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--text-dim)", fontWeight: 500 }}>{l.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{l.sub}</div>
              </div>
              <ArrowIcon size={11} style={{ color: "var(--text-faint)" }} />
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 18px 16px", borderTop: "1px solid var(--line)", marginTop: 6 }}>
          <button disabled aria-disabled="true" title="Support contact is coming soon" style={{
            width: "100%", padding: "8px 0", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", boxShadow: "inset 0 0 0 1px var(--line)",
            border: "none", color: "var(--text-dim)", fontSize: 12.5, fontFamily: "var(--font-sans)",
            cursor: "not-allowed", opacity: 0.6,
          }}>
            Contact support
          </button>
        </div>
      </div>
    </Popover>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────

export function OSTopbar() {
  const pathname = usePathname();
  const { pendingApprovals, state } = useOS();
  const [deployOpen, setDeployOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const pageName = PAGE_LABELS[pathname] ?? "Overview";

  // ⌘K opens palette; ⌘D opens deploy
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); setDeployOpen(true); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  useEffect(() => {
    const openDeploy = () => setDeployOpen(true);
    const openPalette = () => setPaletteOpen(true);
    window.addEventListener("os:open-deploy", openDeploy);
    window.addEventListener("os:open-palette", openPalette);
    return () => {
      window.removeEventListener("os:open-deploy", openDeploy);
      window.removeEventListener("os:open-palette", openPalette);
    };
  }, []);

  const closeAll = () => { setWhatsNewOpen(false); setNotifOpen(false); setHelpOpen(false); };

  const toggle = (panel: "whatsNew" | "notif" | "help") => {
    const next = { whatsNew: panel === "whatsNew" && !whatsNewOpen, notif: panel === "notif" && !notifOpen, help: panel === "help" && !helpOpen };
    setWhatsNewOpen(next.whatsNew);
    setNotifOpen(next.notif);
    setHelpOpen(next.help);
  };

  return (
    <>
      <div className="os-top">
        <div className="os-crumb">
          <span style={{ color: "var(--text-mute)" }}>{state.workspace.name}</span>
          <span className="sep">/</span>
          <span className="cur">{pageName}</span>
        </div>

        <span className="os-env">
          <span className="dot dot-cyan" /> {state.workspace.environment}
        </span>

        <button
          className="os-top-search"
          style={{ cursor: "text", border: "none" }}
          onClick={() => setPaletteOpen(true)}
        >
          <SearchIcon size={13} />
          <span style={{ color: "var(--text-mute)", fontSize: 12.5, flex: 1, textAlign: "left" }}>
            Search agents, workflows, memory...
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 5 }}>
            ⌘K
          </span>
        </button>

        <div className="os-top-actions" style={{ position: "relative" }}>
          {/* What's new */}
          <div style={{ position: "relative" }}>
            <button
              className="os-iconbtn"
              title="What's new"
              aria-label="Open what's new"
              onClick={() => toggle("whatsNew")}
              style={{ background: whatsNewOpen ? "rgba(255,255,255,0.08)" : undefined }}
            >
              <SparkIcon size={14} />
            </button>
            {whatsNewOpen && <WhatsNewPanel onClose={() => setWhatsNewOpen(false)} />}
          </div>

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button
              className="os-iconbtn"
              title={`${pendingApprovals} pending`}
              aria-label="Open notifications"
              onClick={() => toggle("notif")}
              style={{ position: "relative", background: notifOpen ? "rgba(255,255,255,0.08)" : undefined }}
            >
              <BellIcon size={14} />
              {pendingApprovals > 0 && <span className="ping" />}
            </button>
            {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
          </div>

          {/* Help */}
          <div style={{ position: "relative" }}>
            <button
              className="os-iconbtn"
              title="Help"
              aria-label="Open help"
              onClick={() => toggle("help")}
              style={{ background: helpOpen ? "rgba(255,255,255,0.08)" : undefined }}
            >
              <MessageIcon size={14} />
            </button>
            {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 4 }}
            onClick={() => { closeAll(); setDeployOpen(true); }}
          >
            <PlusIcon size={12} /> Deploy agent
          </button>
        </div>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {deployOpen && <DeployModal onClose={() => setDeployOpen(false)} />}
    </>
  );
}
