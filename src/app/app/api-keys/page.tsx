"use client";

import { useState } from "react";
import { KeyIcon, PlusIcon } from "@/components/dashboard/icons";

const INITIAL_KEYS = [
  { name: "Production API key", prefix: "ino_prod_••••••••••••3f8a", created: "14 days ago", last: "2m ago", scope: "Full access" },
  { name: "Revenue Operator key", prefix: "ino_rv_••••••••••••7c2e", created: "8 days ago", last: "14m ago", scope: "Agent - read/write" },
  { name: "Webhook signing secret", prefix: "ino_wh_••••••••••••9b1d", created: "30 days ago", last: "1h ago", scope: "Webhooks only" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(INITIAL_KEYS);

  const createKey = () => {
    const suffix = Math.random().toString(16).slice(2, 6);
    setKeys((prev) => [{ name: "New API key", prefix: `ino_new_••••••••••••${suffix}`, created: "just now", last: "never", scope: "Read only" }, ...prev]);
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">API access - {keys.length} keys</span>
          <h1>API keys</h1>
          <div className="os-page-sub">Manage authentication credentials for Inovense OS integrations and the agent SDK.</div>
        </div>
        <div className="os-page-actions">
          <button className="btn btn-primary btn-sm" onClick={createKey}><PlusIcon size={12} /> Create key</button>
        </div>
      </div>
      <div className="p">
        <div className="p-head">
          <h3><KeyIcon size={13} /> API keys</h3>
          <div className="p-meta">{keys.length} active</div>
        </div>
        {keys.map((k) => (
          <div key={`${k.name}-${k.prefix}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3 }}>{k.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)" }}>{k.prefix}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", marginBottom: 2 }}>Created {k.created}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>Last used {k.last}</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, padding: "3px 8px", borderRadius: 5, background: "rgba(77,232,225,0.08)", color: "var(--cyan)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.2)" }}>{k.scope}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="appr-btn edit" onClick={() => navigator.clipboard?.writeText(k.prefix)}>Copy</button>
              <button className="appr-btn deny" onClick={() => setKeys((prev) => prev.filter((x) => x.prefix !== k.prefix))}>Revoke</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5, color: "var(--text-mute)", lineHeight: 1.6 }}>
        API keys grant access to the Inovense OS API. Treat them like passwords. Rotate every 90 days. Never commit to source control.
      </div>
    </div>
  );
}
