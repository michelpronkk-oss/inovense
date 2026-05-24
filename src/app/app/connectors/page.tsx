"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Nango from "@nangohq/frontend";
import { useOS } from "@/lib/os/app-provider";
import { LinkIcon, PlusIcon } from "@/components/dashboard/icons";
import type { Connector } from "@/lib/os/types";
import { UsageBanner } from "@/components/upgrade-prompt";
import { getEntitlements } from "@/lib/os/entitlements";
import { UpgradeModal } from "@/components/upgrade-modal";
import { isRealConnector, isRealConnectedConnector } from "@/lib/os/truth";

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
  const [hubspotConnectLoading, setHubspotConnectLoading] = useState(false);
  const [hubspotStatus, setHubspotStatus] = useState<{
    status: "connected" | "error" | "pending";
    provider_email?: string | null;
    connected_at?: string | null;
  } | null>(null);

  // Real connected = authenticated via native OAuth or managed OAuth integration
  const realConnectedConnectors = useMemo(
    () => state.connectors.filter((c) => isRealConnectedConnector(c)),
    [state.connectors]
  );
  // Preview connected = connected in preview/demo mode only
  const previewConnections = useMemo(
    () => state.connectors.filter((c) => c.isConnected && !isRealConnector(c) && c.source === "preview"),
    [state.connectors]
  );
  // Not connected at all
  const availableConnectors = useMemo(
    () => state.connectors.filter((c) => !c.isConnected),
    [state.connectors]
  );

  const healthyCount = useMemo(
    () => realConnectedConnectors.filter((c) => c.health === "healthy").length,
    [realConnectedConnectors]
  );

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

  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview";

  const realConnectedCount = realConnectedConnectors.length;
  const connectorLimit = typeof entitlements.connectorsLimit === "number" ? entitlements.connectorsLimit : null;
  const atConnectorLimit = connectorLimit !== null && realConnectedCount >= connectorLimit;
  const planLabel = entitlements.planTier.charAt(0).toUpperCase() + entitlements.planTier.slice(1);

  const startRealGmailOAuth = () => {
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      userEmail: state.currentUser.email,
      userId: state.currentUser.id,
    });
    window.location.href = `/api/connectors/gmail/auth?${qs.toString()}`;
  };

  const fetchHubspotStatus = async () => {
    const res = await fetch(`/api/connectors/nango/status?workspaceId=${encodeURIComponent(state.workspace.id)}&connectorKey=hubspot`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const json = await res.json() as {
      status: "connected" | "error" | "pending";
      provider_email?: string | null;
      connected_at?: string | null;
    };
    setHubspotStatus(json);
    if (json.status === "connected") {
      connectConnector("hubspot", "real");
    } else {
      disconnectConnector("hubspot");
    }
  };

  useEffect(() => {
    fetchHubspotStatus().catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workspace.id]);

  const startHubspotNangoConnect = async () => {
    setHubspotConnectLoading(true);
    try {
      const sessionRes = await fetch("/api/connectors/nango/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          connectorKey: "hubspot",
          userEmail: state.currentUser.email,
          userId: state.currentUser.id,
        }),
      });
      const sessionJson = await sessionRes.json() as { sessionToken?: string; error?: string };
      if (!sessionRes.ok || !sessionJson.sessionToken) {
        setFeedback(sessionJson.error || "Failed to start HubSpot connect.");
        return;
      }

      const nango = new Nango();
      const pollStatus = () => {
        let tries = 0;
        const timer = setInterval(() => {
          tries += 1;
          fetchHubspotStatus().catch(() => undefined);
          if (tries >= 6) clearInterval(timer);
        }, 1500);
      };

      nango.openConnectUI({
        sessionToken: sessionJson.sessionToken,
        onEvent: (event) => {
          if (event.type === "connect" || event.type === "close") {
            pollStatus();
          }
        },
      });
    } catch {
      setFeedback("Could not start secure connector setup.");
    } finally {
      setHubspotConnectLoading(false);
    }
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Connector layer - {realConnectedCount} connected</span>
          <h1>Connectors</h1>
          <div className="os-page-sub">
            Safe system access for operators.{" "}
            {realConnectedCount === 0
              ? "No real accounts connected yet."
              : healthyCount === realConnectedCount
                ? "All active connectors healthy."
                : `${healthyCount} of ${realConnectedCount} healthy.`}
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

      {connectorLimit !== null && (
        <UsageBanner used={realConnectedCount} max={connectorLimit} label="connectors" planLabel={planLabel} />
      )}

      {feedback && <div style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Connected", val: String(realConnectedCount), sub: realConnectedCount > 0 ? `${healthyCount} healthy` : "No real accounts yet" },
          { label: "Available", val: String(availableConnectors.length), sub: "Ready to connect" },
          { label: "Events synced", val: String(realConnectedConnectors.reduce((sum, c) => sum + c.eventsSynced, 0)), sub: "From connected accounts" },
          { label: "Auth errors", val: String(realConnectedConnectors.reduce((sum, c) => sum + c.authErrors, 0)), sub: "Needs review if non-zero" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>

      {/* Real connected accounts */}
      <div className="p" style={{ overflowX: "auto" }}>
        <div className="p-head">
          <h3><LinkIcon size={13} /> Connected accounts</h3>
          <div className="p-meta">
            {realConnectedCount > 0 ? <><span className="dot dot-green" /> {healthyCount}/{realConnectedCount} healthy</> : "None yet"}
          </div>
        </div>
        {realConnectedConnectors.length === 0 ? (
          <div style={{ padding: "24px 18px", fontSize: 12.5, color: "var(--text-faint)" }}>
            No real accounts connected. Click <strong>Add connector</strong> to connect Gmail, HubSpot, or other accounts.
          </div>
        ) : (
          realConnectedConnectors.map((c) => (
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
                <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
                  {c.category} - {c.syncFreq} - {c.id === "gmail" ? "Secure OAuth" : c.id === "hubspot" ? "Managed connector" : "Connector"}
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{c.eventsSynced} events</div>
              <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>synced {c.lastSync}</div>
              <div style={{ fontSize: 10.5, color: c.health === "healthy" ? "var(--green)" : "var(--amber)", fontFamily: "var(--font-mono)" }}>{c.health}</div>
            </button>
          ))
        )}
      </div>

      {/* Preview connections (connected in demo mode only) */}
      {previewConnections.length > 0 && (
        <div className="p" style={{ overflowX: "auto" }}>
          <div className="p-head">
            <h3>Preview connections</h3>
            <div className="p-meta" style={{ color: "var(--cyan)", fontSize: 10.5 }}>Demo only - no real data</div>
          </div>
          {previewConnections.map((c) => (
            <button
              key={c.id}
              onClick={() => setDrawerConnectorId(c.id)}
              style={{ width: "100%", textAlign: "left", border: "none", background: "none", borderBottom: "1px solid var(--line)", padding: "14px 18px", display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px", alignItems: "center", gap: 14, cursor: "pointer" }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${c.color}18`, boxShadow: `inset 0 0 0 1px ${c.color}45`, display: "grid", placeItems: "center", color: c.color, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {c.letter}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{c.category}</div>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>Preview only - not syncing</div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>Preview</div>
            </button>
          ))}
        </div>
      )}

      {/* Add connector modal */}
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
                        {(c.id === "gmail" || c.id === "hubspot") && (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan)", marginTop: 2 }}>
                            {c.id === "gmail" ? "Secure OAuth" : "Secure OAuth"}
                          </div>
                        )}
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
                <ConnectorSetupView connector={setupConnector} isRealConnected={false} />
                {setupConnector.id === "gmail" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>Auth: Native OAuth flow</div>
                )}
                {setupConnector.id === "hubspot" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>
                    Secure OAuth connection{hubspotStatus?.provider_email ? ` · ${hubspotStatus.provider_email}` : ""}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSetupConnectorId(null)}>Cancel</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    connectConnector(setupConnector.id, "preview");
                    setFeedback(`${setupConnector.name} added as preview connector.`);
                    setAddOpen(false);
                    setSetupConnectorId(null);
                  }}>Add as preview</button>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    if (isPreview || atConnectorLimit) {
                      setUpgradeOpen(true);
                      return;
                    }
                    if (setupConnector.id === "gmail") {
                      startRealGmailOAuth();
                      return;
                    }
                    if (setupConnector.id === "hubspot") {
                      startHubspotNangoConnect();
                      return;
                    }
                    connectConnector(setupConnector.id, "real");
                    setFeedback(`${setupConnector.name} real account connected.`);
                    setAddOpen(false);
                    setSetupConnectorId(null);
                  }}>{hubspotConnectLoading && setupConnector.id === "hubspot" ? "Connecting..." : "Connect real account"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connector detail drawer */}
      {drawerConnector && (
        <div className="os-modal-backdrop" onClick={() => setDrawerConnectorId(null)}>
          <div className="os-modal" style={{ width: "min(820px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{drawerConnector.name} details</h3>
              <button className="appr-btn deny" onClick={() => setDrawerConnectorId(null)}>Close</button>
            </div>
            <ConnectorSetupView connector={drawerConnector} isRealConnected={isRealConnectedConnector(drawerConnector)} />
            {drawerConnector.id === "gmail" && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "#9DEFEA" }}>Secure connection via Google OAuth</div>
            )}
            {drawerConnector.id === "hubspot" && hubspotStatus?.status === "connected" && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "#9DEFEA" }}>
                HubSpot account connected{hubspotStatus.provider_email ? ` · ${hubspotStatus.provider_email}` : ""}
              </div>
            )}
            {!isRealConnectedConnector(drawerConnector) && drawerConnector.source === "preview" && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)", fontSize: 12, color: "var(--cyan)" }}>
                Preview connection only. Connect a real account to sync live data and enable operator actions.
              </div>
            )}
            {isRealConnectedConnector(drawerConnector) && (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent sync events</div>
                {(drawerConnector.recentSyncEvents.length ? drawerConnector.recentSyncEvents : ["No sync events yet"]).map((ev) => (
                  <div key={ev} style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>{ev}</div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {isRealConnectedConnector(drawerConnector) && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => { testConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} tested.`); }}>Test connection</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { resyncConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} resynced.`); }}>Resync</button>
                  </>
                )}
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

function ConnectorSetupView({ connector, isRealConnected }: { connector: Connector; isRealConnected: boolean }) {
  // Only show real stats (health, sync, event counts) for genuinely connected accounts.
  // For available or preview connectors, show neutral placeholder values.
  const displayHealth = isRealConnected ? connector.health : "Not connected";
  const displayLastSync = isRealConnected ? connector.lastSync : "—";
  const displayEvents = isRealConnected ? String(connector.eventsSynced) : "—";
  const displayErrors = isRealConnected ? String(connector.authErrors) : "—";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${connector.color}18`, boxShadow: `inset 0 0 0 1px ${connector.color}45`, display: "grid", placeItems: "center", color: connector.color, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{connector.letter}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{connector.name}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>
            {connector.category} - {connector.syncMode} - {connector.syncFreq} - {connector.id === "gmail" ? "Secure OAuth" : connector.id === "hubspot" ? "Managed connector" : "Connector"}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{connector.description}</div>
      {!isRealConnected && (
        <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>
          Not connected. Activate Starter and connect a real account to start syncing.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <TagList title="Required permissions" items={connector.permissions} />
        <TagList title="Read scopes" items={connector.readScopes} />
        <TagList title="Write scopes" items={connector.writeScopes.length ? connector.writeScopes : ["None"]} />
        <TagList title="Approval required for" items={connector.approvalRequiredFor.length ? connector.approvalRequiredFor : ["None"]} />
        <TagList title="Blocked actions" items={connector.blockedActions.length ? connector.blockedActions : ["None"]} />
        <TagList title="Operators allowed" items={connector.operatorsAllowed.length ? connector.operatorsAllowed : ["All operators"]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <Stat label="Status" value={displayHealth} />
        <Stat label="Last synced" value={displayLastSync} />
        <Stat label="Events synced" value={displayEvents} />
        <Stat label="Auth errors" value={displayErrors} />
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
