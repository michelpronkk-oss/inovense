import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Ban, Check, ChevronDown, CircleDot, Layers3, Radar, ShieldCheck, Workflow } from "lucide-react";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import { ProviderLogo } from "@/components/connectors/provider-logo";
import { OperatorAvatar } from "@/components/operators/avatar";
import { CONNECTOR_CATALOG } from "@/lib/connectors/registry";
import { GLYPHS, OPERATORS } from "@/data/operators";
import type { PublicRowData } from "./public-page-components";

export function StorySection({ label, title, description, children, className = "" }: {
  label: string; title: string; description?: string; children: ReactNode; className?: string;
}) {
  return <section className={`public-story ${className}`}><div className="wrap">
    <div className="public-story-heading"><span className="lbl">{label}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {children}
  </div></section>;
}

export function DetailGroup({ title, description, rows }: { title: string; description?: string; rows: PublicRowData[] }) {
  return <div className="public-detail-group"><h3>{title}</h3>{description && <p>{description}</p>}
    <details className="public-disclosure"><summary>Explore the details<span className="sr-only">: {title}</span></summary>
      <div className="public-detail-copy">{rows.map((row) => <section key={row.title}><h4>{row.title}</h4><p>{row.body}</p></section>)}</div>
    </details>
  </div>;
}

const flow = [
  { title: "Systems", body: "The tools you already trust.", Icon: Layers3 },
  { title: "Detect", body: "A signal needs attention.", Icon: Radar },
  { title: "Operator", body: "One owner prepares the next move.", Icon: CircleDot },
  { title: "Approval", body: "A human checkpoint, if needed.", Icon: ShieldCheck },
  { title: "Execute", body: "Only inside your policy.", Icon: Workflow },
  { title: "Outcome", body: "Observe what changed.", Icon: Check },
];

export function OperatingFlow() {
  return <div className="operating-flow" aria-label="Auterim operating flow">
    <div className="public-surface-label"><span>From signal to follow-through</span><span>Under your rules</span></div>
    <ol>{flow.map(({ title, body, Icon }) => <li key={title} className={title === "Approval" ? "flow-approval" : ""}>
      <div className="flow-icon"><Icon size={22} strokeWidth={1.4} aria-hidden="true" /></div><h3>{title}</h3><p>{body}</p>
    </li>)}</ol>
    <p className="public-surface-caption">Your systems remain the source of record. An executed action is a step forward; the outcome still needs evidence.</p>
  </div>;
}

export function PolicyBoundary() {
  return <div className="policy-boundary">
    <div className="public-surface-label"><span>Workspace policy</span><ShieldCheck size={17} aria-hidden="true" /></div>
    <div className="policy-proposal"><span className="lbl">Prepared work</span><h3>One action. A clear decision.</h3><p>The policy check happens before execution.</p></div>
    <div className="policy-paths">
      <div><Check size={21} aria-hidden="true" /><span className="lbl">Allowed</span><h4>Continue inside policy.</h4><p>The action can run within its granted permissions.</p></div>
      <div className="policy-checkpoint"><ShieldCheck size={21} aria-hidden="true" /><span className="lbl">Approval checkpoint</span><h4>Pause for a decision.</h4><p>The named reviewer decides whether the waiting action proceeds.</p></div>
      <div><Ban size={21} aria-hidden="true" /><span className="lbl">Blocked</span><h4>Stop at the boundary.</h4><p>An action ruled out by policy does not continue.</p></div>
    </div>
  </div>;
}

export function OperatorProfileGrid({ operators }: { operators: PublicRowData[] }) {
  return <div className="operator-profile-grid">{operators.map((operator, index) => {
    const identity = OPERATORS.find((candidate) => candidate.name === operator.title);
    if (!identity) return null;
    const field = (prefix: string) => {
      const value = operator.bullets?.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim();
      return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
    };
    const watches = field("Watches:");
    const prepares = field("Prepares:");
    const detects = field("Detects:");
    const execute = field("Can execute:");
    const approval = field("Requires approval:");
    const outcome = field("Example outcome:");
    return <article className="operator-profile" key={operator.title} style={{ "--operator-accent": identity.color } as CSSProperties}>
      <div className="operator-profile-top"><OperatorAvatar color={identity.color} glyph={GLYPHS[identity.glyph]} size={56} /><span className="operator-profile-index">{String(index + 1).padStart(2, "0")}</span></div>
      <span className="operator-profile-state">Available today · Approval aware</span>
      <h3>{operator.title}</h3><p className="operator-profile-summary">{operator.body}</p>
      <dl className="operator-profile-signals"><div><dt>Watches</dt><dd>{watches}</dd></div><div><dt>Prepares</dt><dd>{prepares}</dd></div><div><dt>Moves forward</dt><dd>{execute}</dd></div></dl>
      <details className="operator-profile-details">
        <summary><span>View role details<span className="sr-only">: {operator.title}</span></span><ChevronDown size={17} aria-hidden="true" /></summary>
        <div className="operator-detail-content">
          <div><span className="operator-detail-label">Looks for</span><p>{detects}</p></div>
          <div><span className="operator-detail-label">Approval boundary</span><p>{approval}</p></div>
          <div className="operator-detail-outcome"><span className="operator-detail-label">Example next step</span><p>{outcome}</p></div>
        </div>
      </details>
    </article>;
  })}</div>;
}

export type Topic = { title: string; description: string; href: string; Icon: typeof Layers3 };
export function TopicGrid({ topics }: { topics: Topic[] }) {
  return <div className="public-topic-grid">{topics.map(({ title, description, href, Icon }) => <Link href={href} className="public-topic" key={title}>
    <Icon size={25} strokeWidth={1.4} aria-hidden="true" /><h3>{title}</h3><p>{description}</p><span className="public-topic-link">Explore guide<ArrowRight size={16} aria-hidden="true" /></span>
  </Link>)}</div>;
}

export function ConnectionLayer({ connectorCount, className = "" }: { connectorCount?: number; className?: string } = {}) {
  const liveConnectorCount = connectorCount ?? Object.values(CONNECTOR_CATALOG).filter((connector) => connector.status === "available").length;
  return <div className={`connection-layer connector-connection-layer${className ? ` ${className}` : ""}`} role="group" aria-label="Available systems connect to Auterim, where approved context becomes prepared work">
    <div className="connector-source-panel"><div className="connector-visual-label"><span>Connected systems</span><span>{String(liveConnectorCount).padStart(2, "0")} available</span></div>
      <div className="connector-logo-cloud" role="group" aria-label="Featured available providers"><ProviderLogo connectorKey="gmail" box={38} size={23} radius={12} /><ProviderLogo connectorKey="microsoft" box={38} size={23} radius={12} /><ProviderLogo connectorKey="hubspot" box={38} size={23} radius={12} /><ProviderLogo connectorKey="slack" box={38} size={23} radius={12} /><ProviderLogo connectorKey="google_drive" box={38} size={23} radius={12} /></div>
      <p>Start with the systems your team already trusts.</p>
    </div>
    <ArrowRight className="connection-arrow" size={20} aria-hidden="true" />
    <div className="connection-core"><Image className="connection-brand-mark" src="/brand/auterim-mark-live.svg" alt="" width={24} height={24} aria-hidden="true" /><span>Auterim</span><p>Joins the context that matters.</p></div>
    <ArrowRight className="connection-arrow" size={20} aria-hidden="true" />
    <div className="connector-outcome-panel"><Workflow size={22} strokeWidth={1.4} aria-hidden="true" /><span>Prepared work</span><p>Moves forward inside your approval boundary.</p></div>
  </div>;
}
