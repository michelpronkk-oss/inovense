import Image from "next/image";
import { Icon } from "./icons";

const CONTEXT_SOURCES = [
  { icon: "artifactWeb", label: "Website" },
  { icon: "artifactPipeline", label: "HubSpot" },
  { icon: "artifactMemory", label: "Memory" },
] as const;

const SEQUENCE_STEPS: ReadonlyArray<{ label: string; time: string; state?: "now" }> = [
  { label: "Signal detected", time: "00:02" },
  { label: "Context prepared", time: "00:11" },
  { label: "Reply prepared", time: "held at gate", state: "now" },
];

export default function HeroMobileOperatingLoop() {
  return (
    <div
      className="hero-mobile-loop"
      role="img"
      aria-label="Revenue Operator gathered context from the website, HubSpot, and company memory, detected a signal, and prepared the next reply. It is now held at the approval gate, awaiting Approve or Edit."
    >
      <div className="hero-mobile-loop-top">
        <span className="hero-mobile-loop-top-k">Auterim operating layer</span>
        <span className="hero-mobile-loop-run"><i />Prepared work</span>
      </div>

      <div className="hero-mobile-loop-ctx" aria-hidden="true">
        {CONTEXT_SOURCES.map((source) => (
          <span key={source.label}>
            <Icon name={source.icon} size={13} />
            {source.label}
          </span>
        ))}
      </div>

      <div className="hero-mobile-loop-op" aria-hidden="true">
        <span className="hero-mobile-loop-mark">
          <Image src="/brand/auterim-mark-live.svg" width={14} height={14} alt="" />
        </span>
        <span className="hero-mobile-loop-op-name">Revenue Operator</span>
        <span className="hero-mobile-loop-op-tag">Active</span>
      </div>

      <ul className="hero-mobile-loop-seq" aria-hidden="true">
        {SEQUENCE_STEPS.map((step) => (
          <li className={step.state === "now" ? "is-now" : undefined} key={step.label}>
            <span>{step.label}</span>
            <em>{step.time}</em>
          </li>
        ))}
      </ul>

      <div className="hero-mobile-loop-gate" aria-hidden="true">
        <span className="hero-mobile-loop-gate-k"><i />Awaiting approval</span>
        <div className="hero-mobile-loop-gate-acts">
          <span className="is-go">Approve</span>
          <span className="is-ed">Edit first</span>
        </div>
      </div>
    </div>
  );
}
