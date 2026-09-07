import { KeyIcon } from "@/components/dashboard/icons";

/** API-key issuance is intentionally absent until a secure runtime exists. */
export default function ApiKeysPage() {
  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">API access</span>
          <h1>API keys</h1>
          <div className="os-page-sub">Programmatic API access is not enabled for this workspace.</div>
        </div>
      </div>
      <div className="p" style={{ maxWidth: 760 }}>
        <div className="p-head"><h3><KeyIcon size={13} /> API key management</h3><span className="p-meta">Unavailable</span></div>
        <div style={{ padding: "16px 18px", fontSize: 12.5, lineHeight: 1.65, color: "var(--text-dim)" }}>
          Auterim does not create, display, or accept workspace API keys yet. There are no active keys to revoke. This avoids presenting local-only credentials that would not secure a real integration.
        </div>
      </div>
    </div>
  );
}
