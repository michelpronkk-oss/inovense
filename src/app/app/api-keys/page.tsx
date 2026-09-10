import Link from "next/link";
import { PageHeader } from "@/components/product-ui/page-primitives";

/** API-key issuance is intentionally absent until a secure runtime exists. */
export default function ApiKeysPage() {
  return (
    <div className="os-page">
      <PageHeader
        eyebrow="API access"
        title="API keys"
        description="Programmatic API access is not enabled for this workspace."
      />
      <section className="empty sec">
        <span className="badge muted">NOT AVAILABLE</span>
        <h4 style={{ marginTop: 14 }}>API key management</h4>
        <p>Auterim does not create, display, or accept workspace API keys yet. There are no active keys to revoke. This avoids presenting local-only credentials that would not secure a real integration.</p>
        <div className="acts">
          <Link href="/roadmap" className="btn btn-secondary btn-sm">See roadmap</Link>
        </div>
      </section>
    </div>
  );
}
