import { Icon } from "./icons";

const CONTEXT_SOURCES = [
  { icon: "artifactWeb", label: "Website enquiry" },
  { icon: "artifactPipeline", label: "HubSpot history" },
  { icon: "artifactMemory", label: "Company memory" },
] as const;

const SEQUENCE_STEPS = [
  { label: "Signal received", time: "00:02", state: "done" },
  { label: "Context assembled", time: "00:11", state: "done" },
  { label: "Lead qualified", time: "00:19", state: "done" },
  { label: "Reply prepared", time: "held at gate", state: "now" },
  { label: "CRM updated", time: "on approval", state: "next" },
] as const;

const RAIL_PATHS = [
  "M87 0v12c0 7 5 10 12 10h149c8 0 12 3 12 10v4",
  "M260 0v36",
  "M433 0v12c0 7-5 10-12 10H272c-8 0-12 3-12 10v4",
];

export default function HeroOperatingArtifact() {
  return (
    <div
      className="hero-artifact sequence-in"
      role="img"
      aria-label="Revenue Operator gathers connected context, prepares a reply, and pauses for approval before updating the CRM."
    >
      <div className="hero-artifact-panel">
        <div className="hero-artifact-top">
          <span className="hero-artifact-badge" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#mk" /></svg></span>
          <span className="hero-artifact-top-k">Auterim operating layer</span>
          <span className="hero-artifact-run"><i />Prepared work</span>
        </div>

        <div className="hero-artifact-ctx">
          {CONTEXT_SOURCES.map((source) => (
            <div key={source.label}>
              <Icon name={source.icon} size={15} />
              <b>{source.label}</b>
            </div>
          ))}
        </div>
        <svg className="hero-artifact-rail" viewBox="0 0 520 36" preserveAspectRatio="none" aria-hidden="true">
          {RAIL_PATHS.map((d) => <path d={d} key={`rail-${d}`} />)}
          {RAIL_PATHS.map((d) => <path className="hero-artifact-rail-fl" d={d} key={`rail-fl-${d}`} />)}
        </svg>
        <p className="hero-artifact-ctx-f">3 sources assembled &middot; policy applied</p>

        <div className="hero-artifact-mobile-proof" aria-hidden="true">
          <div>
            <span>Operator</span>
            <strong>Revenue Operator <em>Active</em></strong>
          </div>
          <div>
            <span>Next move</span>
            <strong>Reply prepared <em>Approval required</em></strong>
          </div>
        </div>

        <div className="hero-artifact-op">
          <span className="hero-artifact-op-ic"><Icon name="trend" size={18} strokeWidth={1.4} /></span>
          <div>
            <h2>Revenue Operator</h2>
            <div className="hero-artifact-op-co">Inbound opportunity</div>
          </div>
        </div>
        <p className="hero-artifact-task">Qualify the enquiry and prepare the first reply.</p>

        <ul className="hero-artifact-seq">
          {SEQUENCE_STEPS.map((step) => (
            <li className={step.state !== "done" ? `hero-artifact-seq-${step.state}` : undefined} key={step.label}>
              {step.label}<em>{step.time}</em>
            </li>
          ))}
        </ul>
        <div className="hero-artifact-grain" aria-hidden="true">
          <svg viewBox="0 0 216 216" preserveAspectRatio="none"><rect width="216" height="216" filter="url(#heroN)" /></svg>
        </div>
      </div>

      <div className="hero-artifact-gate" aria-hidden="true">
        <span className="hero-artifact-gate-k">Approval required</span>
        <p>First reply is ready for review.</p>
        <div className="hero-artifact-gate-rdy">The reply and CRM update are ready.</div>
        <div className="hero-artifact-gate-acts">
          <span className="hero-artifact-mini hero-artifact-mini-go">Approve</span>
          <span className="hero-artifact-mini hero-artifact-mini-ed">Edit first</span>
        </div>
      </div>
    </div>
  );
}
