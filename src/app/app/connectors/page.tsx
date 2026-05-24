"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { LinkIcon, PlusIcon } from "@/components/dashboard/icons";
import type { Connector } from "@/lib/os/types";
import { getPlanLimits, isAtConnectorLimit } from "@/lib/os/plans";
import { UsageBanner } from "@/components/upgrade-prompt";
import { getEntitlements } from "@/lib/os/entitlements";
import { UpgradeModal } from "@/components/upgrade-modal";

const CATEGORY_ORDER = [
  "All",
  "Communication",
  "CRM and sales",
  "Calendar and scheduling",
  "Docs and knowledge",
  "Payments and commerce",
  "Support",
  "Work and project management",
  "Automation and custom",
];

export default function ConnectorsPage() {
  const {
    state,
    connectConnector,
    disconnectConnector,
    testConnector,
    resyncConnector,
    updateConnectorPermissions,
  } = useOS();

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [setupConnectorId, setSetupConnectorId] = useState<string | null>(null);
  const [drawerConnectorId, setDrawerConnectorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const activeConnectors = useMemo(() => state.connectors.filter((c) => c.isConnected), [state.connectors]);
  const availableConnectors = useMemo(() => state.connectors.filter((c) => !c.isConnected), [state.connectors]);
  const healthyCount = useMemo(() => activeConnectors.filter((c) => c.health === "healthy").length, [activeConnectors]);

  const filteredAvailable = useMemo(() => {
    return availableConnectors.filter((c) => {
      const byCategory = category === "All" || c.category === category;
      const q = search.trim().toLowerCase();
      const bySearch = !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      return byCategory && bySearch;
    });
  }, [availableConnectors, category, search]);

  const setupConnector = state.connectors.find((c) => c.id === setupConnectorId) ?? null;
  const drawerConnector = state.connectors.find((c) => c.id === drawerConnectorId) ?? null;

  const limits = getPlanLimits(state.workspace.plan);
  const atConnectorLimit = isAtConnectorLimit(state.workspace.plan, activeConnectors.length);
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview";

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Connector layer - {activeConnectors.length} connected</span>
          <h1>Connectors</h1>
          <div className="os-page-sub">
            Safe system access for operators. {healthyCount === activeConnectors.length ? "All active connectors healthy." : `${healthyCount} of ${activeConnectors.length} healthy.`}
          </div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Preview mode: connectors run in local mock mode. Activate Starter to connect real accounts.
            </div>
          )}
        </div>
        <div className="os-page-actions">
          {atConnectorLimit ? (
            <Link
              href="/pricing"
              className="btn btn-sm"
              style={{ background: "rgba(77,232,225,0.08)", color: "#4DE8E1", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
            >
              <PlusIcon size={12} /> Upgrade to add more
            </Link>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setSetupConnectorId(null); setSearch(""); setCategory("All"); }}>
              <PlusIcon size={12} /> Add connector
            </button>
          )}
        </div>
      </div>

      {limits.maxConnectors !== -1 && (
        <UsageBanner used={activeConnectors.length} max={limits.maxConnectors} label="connectors" planLabel={limits.name} />
      )}

      {feedback && <div style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Connected", val: String(activeConnectors.length), sub: `${healthyCount} healthy` },
          { label: "Available", val: String(availableConnectors.length), sub: "Ready to connect" },
          { label: "Events synced", val: String(activeConnectors.reduce((sum, c) => sum + c.eventsSynced, 0)), sub: "Local mock stream" },
          { label: "Auth errors", val: String(activeConnectors.reduce((sum, c) => sum + c.authErrors, 0)), sub: "Needs review if non-zero" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div className="p" style={{ overflowX: "auto" }}>
        <div className="p-head">
          <h3><LinkIcon size={13} /> Active connectors</h3>
          <div className="p-meta"><span className="dot dot-green" /> {healthyCount}/{activeConnectors.length} healthy</div>
        </div>
        {activeConnectors.map((c) => (
          <button
            key={c.id}
            onClick={() => setDrawerConnectorId(c.id)}
            style={{ width: "100%", textAlign: "left", border: "none", background: "none", borderBottom: "1px solid var(--line)", padding: "14px 18px", display: "grid", gridTemplateColumns: "40px 1fr 160px 130px 120px", alignItems: "center", gap: 14, cursor: "pointer" }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${c.color}18`, boxShadow: `inset 0 0 0 1px ${c.color}45`, display: "grid", placeItems: "center", color: c.color, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {c.letter}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{c.category} - {c.syncFreq}</div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{c.eventsSynced} events</div>
            <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>synced {c.lastSync}</div>
            <div style={{ fontSize: 10.5, color: c.health === "healthy" ? "var(--green)" : "var(--amber)", fontFamily: "var(--font-mono)" }}>{c.health}</div>
          </button>
        ))}
      </div>

      {addOpen && (
        <div className="os-modal-backdrop" onClick={() => { setAddOpen(false); setSetupConnectorId(null); }}>
          <div className="os-modal" style={{ width: "min(980px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            {!setupConnector ? (
              <>
                <div className="os-modal-head">
                  <h3>Add connector</h3>
                  <button className="appr-btn deny" onClick={() => setAddOpen(false)}>Close</button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input className="os-input" placeholder="Search connectors..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {CATEGORY_ORDER.map((cat) => (
                      <button key={cat} className={`appr-btn ${category === cat ? "approve" : "edit"}`} onClick={() => setCategory(cat)}>{cat}</button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {filteredAvailable.map((c) => (
                      <button key={c.id} onClick={() => setSetupConnectorId(c.id)} style={{ textAlign: "left", border: "none", cursor: "pointer", padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.color}18`, boxShadow: `inset 0 0 0 1px ${c.color}45`, display: "grid", placeItems: "center", color: c.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.letter}</div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-mute)" }}>{c.category}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>{c.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="os-modal-head">
                  <h3>Setup connector</h3>
                  <button className="appr-btn deny" onClick={() => setSetupConnectorId(null)}>Back</button>
                </div>
                <ConnectorSetupView connector={setupConnector} isPreview={isPreview} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSetupConnectorId(null)}>Cancel</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    connectConnector(setupConnector.id, "preview");
                    setFeedback(`${setupConnector.name} connected.`);
                    setAddOpen(false);
                    setSetupConnectorId(null);
                  }}>Preview connector</button>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    if (isPreview) {
                      setUpgradeOpen(true);
                      return;
                    }
                    connectConnector(setupConnector.id, "real");
                    setFeedback(`${setupConnector.name} real account connected.`);
                    setAddOpen(false);
                    setSetupConnectorId(null);
                  }}>Connect real account</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {drawerConnector && (
        <div className="os-modal-backdrop" onClick={() => setDrawerConnectorId(null)}>
          <div className="os-modal" style={{ width: "min(820px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{drawerConnector.name} details</h3>
              <button className="appr-btn deny" onClick={() => setDrawerConnectorId(null)}>Close</button>
            </div>
            <ConnectorSetupView connector={drawerConnector} isPreview={isPreview} />
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent sync events</div>
              {(drawerConnector.recentSyncEvents.length ? drawerConnector.recentSyncEvents : ["No sync events yet"]).map((ev) => (
                <div key={ev} style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>{ev}</div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { testConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} tested.`); }}>Test connection</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { resyncConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} resynced.`); }}>Resync</button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const next = drawerConnector.operatorsAllowed.includes("Support Operator")
                    ? drawerConnector.operatorsAllowed.filter((x) => x !== "Support Operator")
                    : [...drawerConnector.operatorsAllowed, "Support Operator"];
                  updateConnectorPermissions(drawerConnector.id, next);
                  setFeedback(`${drawerConnector.name} permissions updated.`);
                }}>Update operators</button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { disconnectConnector(drawerConnector.id); setDrawerConnectorId(null); setFeedback(`${drawerConnector.name} disconnected.`); }}>Disconnect</button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Activate real connectors"
        body="Preview connectors let you model your stack. Activate Starter to connect real accounts and run operators live."
      />
    </div>
  );
}

function ConnectorSetupView({ connector, isPreview }: { connector: Connector; isPreview: boolean }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${connector.color}18`, boxShadow: `inset 0 0 0 1px ${connector.color}45`, display: "grid", placeItems: "center", color: connector.color, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{connector.letter}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{connector.name}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{connector.category} - {connector.syncMode} - {connector.syncFreq}</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{connector.description}</div>
      {isPreview && (
        <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>
          Preview only. Activate Starter to connect real account.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <TagList title="Required permissions" items={connector.permissions} />
        <TagList title="Read scopes" items={connector.readScopes} />
        <TagList title="Write scopes" items={connector.writeScopes.length ? connector.writeScopes : ["None"]} />
        <TagList title="Approval required for" items={connector.approvalRequiredFor.length ? connector.approvalRequiredFor : ["None"]} />
        <TagList title="Blocked actions" items={connector.blockedActions.length ? connector.blockedActions : ["None"]} />
        <TagList title="Operators allowed" items={connector.operatorsAllowed} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <Stat label="Health" value={connector.health} />
        <Stat label="Last synced" value={connector.lastSync} />
        <Stat label="Events synced" value={String(connector.eventsSynced)} />
        <Stat label="Auth errors" value={String(connector.authErrors)} />
      </div>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map((it) => <span key={it} className="appr-btn edit" style={{ cursor: "default" }}>{it}</span>)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 9, borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
