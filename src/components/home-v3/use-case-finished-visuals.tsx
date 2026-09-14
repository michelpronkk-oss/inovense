import type { CSSProperties, ReactNode } from "react";

function GxNoiseFilter({ id }: { id: string }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" />
        </filter>
      </defs>
    </svg>
  );
}

function AuterimMark() {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor">
      <path fillRule="evenodd" d="M32,4 L57,49 Q32,40 7,49 Z M32,21 L41,37 Q32,34 23,37 Z" />
      <path d="M10,58 Q32,50 54,58 Q32,54.5 10,58 Z" />
    </svg>
  );
}

type GxCardProps = {
  filterId: string;
  title: string;
  stat?: string;
  loop?: boolean;
  foot?: ReactNode;
  children: ReactNode;
};

function GxCard({ filterId, title, stat, loop, foot, children }: GxCardProps) {
  return (
    <div className={`gx${loop ? " is-loop" : ""}`}>
      <div className="gx-grid" aria-hidden="true" />
      <div className="gx-bloom" aria-hidden="true" />
      {loop && <div className="gx-vig" aria-hidden="true" />}
      <div className="gx-edge" aria-hidden="true" />
      <div className="gx-top">
        <span className="mk-badge"><AuterimMark /></span>
        <span className="t">{title}</span>
        {stat && <span className="stat">{stat}</span>}
      </div>
      {children}
      {foot}
      <div className="gx-grain" aria-hidden="true">
        <svg viewBox="0 0 216 216" preserveAspectRatio="none"><rect width={216} height={216} filter={`url(#${filterId})`} /></svg>
      </div>
    </div>
  );
}

type GxRowNode = {
  key: string;
  icon: ReactNode;
  label: string;
  amber?: boolean;
  tag?: string;
};

const GX_ROW_CYCLE = 5;
const GX_ROW_TRAVEL = GX_ROW_CYCLE * 0.7;
const ROW_COMET_KEYFRAME: Record<number, string> = { 3: "uc-gx-comet3", 4: "uc-gx-comet4" };

function GxRow({ nodes, amberEnd }: { nodes: GxRowNode[]; amberEnd?: boolean }) {
  const count = nodes.length;
  const nodeDelay = (index: number) => (GX_ROW_TRAVEL * index) / (count - 1);
  const cometKeyframe = ROW_COMET_KEYFRAME[count] ?? ROW_COMET_KEYFRAME[3];
  return (
    <div className="gx-flow">
      <div
        className={`gx-row${amberEnd ? " is-amber" : ""}`}
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` } as CSSProperties}
      >
        <span className="gx-row-rail" aria-hidden="true" />
        <span
          className="gx-comet"
          style={{ animationName: cometKeyframe, animationDuration: `${GX_ROW_CYCLE}s` } as CSSProperties}
          aria-hidden="true"
        />
        {nodes.map((node, index) => (
          <div
            className={`gx-node${node.amber ? " am" : ""}`}
            style={{ "--gx-delay": `${nodeDelay(index)}s` } as CSSProperties}
            key={node.key}
          >
            <span className="gx-dot">
              <span className="gx-ring" aria-hidden="true" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">{node.icon}</svg>
            </span>
            <span className="k">{node.label}</span>
            {node.tag && <span className="tag"><span className="p" />{node.tag}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function GxTake({ heading, copy }: { heading: string; copy: ReactNode }) {
  return (
    <div className="gx-take">
      <span className="lab2">Takeaway</span>
      <span className="h">{heading}</span>
      <span className="c">{copy}</span>
    </div>
  );
}

const ICON = {
  signal: <><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M3 12h3M18 12h3" /><circle cx={12} cy={12} r={2.6} strokeWidth={1.5} /></>,
  operator: <><circle cx={12} cy={8} r={3.2} strokeWidth={1.5} /><path d="M4.8 20c1-3.6 3.9-5.6 7.2-5.6s6.2 2 7.2 5.6" /></>,
  envelope: <path d="M4 5h16v11H9l-5 4V5Z" strokeLinejoin="round" />,
  check: <path d="M5 12.5 9.5 17 19 6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />,
  missingStep: <><circle cx={12} cy={12} r={8.5} strokeWidth={1.5} /><path d="M12 8v5" /><circle cx={12} cy={16} r={0.6} fill="currentColor" stroke="none" /></>,
  context: <path d="M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5 M3 16.5l9 5 9-5" strokeWidth={1.4} strokeLinejoin="round" />,
  handoff: <path d="M4 12h13M13 7l4 5-4 5" />,
  blocked: <path d="M6 3v18M6 4h11l-3 4 3 4H6" strokeLinejoin="round" />,
  ticket: <><rect x={3} y={6} width={18} height={12} rx={2} /><path d="M9 6v12M15 6v12" strokeDasharray="1 3" /></>,
  prepared: <><path d="M12 3v6M12 3l-3 3M12 3l3 3" strokeLinecap="round" strokeLinejoin="round" /><circle cx={12} cy={16} r={4} strokeWidth={1.4} /></>,
  executed: <path d="M6 4l12 8-12 8V4Z" strokeLinejoin="round" />,
  observed: <><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" strokeLinejoin="round" /><circle cx={12} cy={12} r={2.4} strokeWidth={1.4} /></>,
  recorded: <><rect x={4} y={4} width={16} height={16} rx={2} /><path d="M8 9h8M8 12.5h8M8 16h5" strokeLinecap="round" /></>,
};

const LOOP_ICON = {
  signal: <><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M3 12h3M18 12h3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /><circle cx={12} cy={12} r={2.6} fill="none" stroke="currentColor" strokeWidth={1.5} /></>,
  context: <path d="M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5 M3 16.5l9 5 9-5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />,
  operator: <><circle cx={12} cy={8} r={3.4} fill="none" stroke="currentColor" strokeWidth={1.5} /><path d="M4.8 20c1-3.6 3.9-5.6 7.2-5.6s6.2 2 7.2 5.6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /></>,
  outcome: <path d="M5 12.5 9.5 17 19 6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />,
};

const LOOP_NODES = [
  { key: "signal", icon: LOOP_ICON.signal, k: "Signal", x: "A change lands in a connected system.", amber: false },
  { key: "context", icon: LOOP_ICON.context, k: "Context", x: "Auterim reads the record and what it means.", amber: false },
  { key: "operator", icon: LOOP_ICON.operator, k: "Operator", x: "A named role prepares the next move.", amber: true },
  { key: "outcome", icon: LOOP_ICON.outcome, k: "Outcome", x: "Approved, executed, and logged in full.", amber: false },
];

export function OperatingLoopVisual() {
  return (
    <>
      <GxNoiseFilter id="gxN2" />
      <GxCard filterId="gxN2" title="Signal to outcome" loop
        foot={<div className="gx-loop-foot"><span>Every stage logged</span><span className="am">Approval required by default</span></div>}
      >
        <div className="gx-loop-flow">
          {LOOP_NODES.map((node) => (
            <div className={`gx-loop-node${node.amber ? " am" : ""}`} key={node.key}>
              <div className="gx-loop-track" />
              <span className="gx-loop-pt"><svg viewBox="0 0 24 24">{node.icon}</svg></span>
              <span className="k">{node.k}</span>
              <span className="x">{node.x}</span>
            </div>
          ))}
        </div>
      </GxCard>
    </>
  );
}

export function RevenueVisual() {
  return (
    <>
      <GxNoiseFilter id="gxN3" />
      <GxCard filterId="gxN3" title="Revenue signal flow" stat="4 stages">
        <GxRow
          amberEnd
          nodes={[
            { key: "signal", icon: ICON.signal, label: "Pricing signal" },
            { key: "operator", icon: ICON.operator, label: "Revenue Operator" },
            { key: "reply", icon: ICON.envelope, label: "Reply prepared" },
            { key: "approval", icon: ICON.check, label: "Approval if external", amber: true, tag: "Human gate" },
          ]}
        />
        <GxTake
          heading="Pricing intent becomes a prepared next move."
          copy={<><b>Email + CRM + memory</b> &middot; pricing intent, timing, team size, competitor review, stalled deals, renewals and expansion &middot; <i>external approval if needed</i>.</>}
        />
      </GxCard>
    </>
  );
}

export function ClientFlowVisual() {
  return (
    <>
      <GxNoiseFilter id="gxN4" />
      <GxCard filterId="gxN4" title="Client Flow handoff" stat="3 stages">
        <GxRow
          nodes={[
            { key: "missing", icon: ICON.missingStep, label: "Missing step" },
            { key: "context", icon: ICON.context, label: "Context assembled" },
            { key: "handoff", icon: ICON.handoff, label: "Handoff prepared" },
          ]}
        />
        <GxTake
          heading="The right owner sees what remains open."
          copy={<>Email + <b>client record</b> + <b>project context</b> + <b>workspace memory</b> &middot; external follow-up <i>follows policy</i>.</>}
        />
      </GxCard>
    </>
  );
}

export function OperationsVisual() {
  return (
    <>
      <GxNoiseFilter id="gxNa" />
      <GxCard filterId="gxNa" title="Operations blocker" stat="3 stages">
        <GxRow
          nodes={[
            { key: "blocked", icon: ICON.blocked, label: "Blocked work" },
            { key: "operator", icon: ICON.operator, label: "Operations Operator" },
            { key: "owner", icon: ICON.operator, label: "Owner and next action" },
          ]}
        />
        <GxTake
          heading="The blocker reaches its owner with a clear next move."
          copy={<><b>Trello or Jira</b> + connected team context &middot; blocked tasks, overdue work, stalled cards and <i>delivery risk</i>.</>}
        />
      </GxCard>
    </>
  );
}

export function SupportVisual() {
  return (
    <>
      <GxNoiseFilter id="gxNb" />
      <GxCard filterId="gxNb" title="Support escalation" stat="3 stages">
        <GxRow
          nodes={[
            { key: "issue", icon: ICON.ticket, label: "Open issue" },
            { key: "operator", icon: ICON.operator, label: "Support Operator" },
            { key: "reply", icon: ICON.envelope, label: "Reply or escalation" },
          ]}
        />
        <GxTake
          heading="The issue reaches the right owner with the next response prepared."
          copy={<><b>Ticket + conversation</b> &middot; unresolved issues, repeat signals and SLA pressure &middot; <i>approval where required</i>.</>}
        />
      </GxCard>
    </>
  );
}

export function OutcomesVisual() {
  return (
    <>
      <GxNoiseFilter id="gxNc" />
      <GxCard filterId="gxNc" title="What happens next" stat="4 stages">
        <GxRow
          nodes={[
            { key: "prepared", icon: ICON.prepared, label: "Prepared" },
            { key: "executed", icon: ICON.executed, label: "Executed" },
            { key: "observed", icon: ICON.observed, label: "Observed" },
            { key: "recorded", icon: ICON.recorded, label: "Recorded" },
          ]}
        />
        <GxTake
          heading="Every outcome is one of three honest states."
          copy={<><b>Follow-up sent</b> &middot; <b>Blocker resolved</b> &middot; <i>No outcome yet</i>.</>}
        />
      </GxCard>
    </>
  );
}

type BnNode = { key: string; left: string; top: number; label: string; amber?: boolean; top2?: boolean; delay?: number };
type BnTick = { left: string; top: number; height: number; delay?: number };

function GxBranch({ nodes, ticks }: { nodes: BnNode[]; ticks: BnTick[] }) {
  return (
    <div className="gx-flow2">
      {nodes.map((node) => (
        <div
          className={`bn${node.top2 ? " bn-top" : ""}`}
          style={{ left: node.left, top: node.top, ...(node.delay !== undefined ? { "--gx-delay": `${node.delay}s` } : {}) } as CSSProperties}
          key={node.key}
        >
          <span className={`d${node.amber ? " am" : ""}${node.delay !== undefined ? " is-live" : ""}`} />
          <span className={`k${node.amber ? " am" : ""}`}>{node.label}</span>
        </div>
      ))}
      {ticks.map((tick, index) => (
        <div
          className={`tick${tick.delay !== undefined ? " is-live" : ""}`}
          style={{ left: `calc(${tick.left} - .5px)`, top: tick.top, height: tick.height, ...(tick.delay !== undefined ? { "--gx-delay": `${tick.delay}s` } : {}) } as CSSProperties}
          key={index}
        />
      ))}
    </div>
  );
}

export function SharedContextVisual() {
  return (
    <>
      <GxNoiseFilter id="gxNd" />
      <GxCard filterId="gxNd" title="Shared context, one selected owner">
        <GxBranch
          nodes={[
            { key: "company", left: "62.5%", top: 20, label: "Company context", top2: true, delay: 0 },
            { key: "revenue", left: "12.5%", top: 110, label: "Revenue", delay: 0.9 },
            { key: "client", left: "37.5%", top: 110, label: "Client Flow", delay: 1.7 },
            { key: "operations", left: "62.5%", top: 110, label: "Operations", delay: 2.5 },
            { key: "support", left: "87.5%", top: 110, label: "Support", delay: 3.3 },
            { key: "owner", left: "37.5%", top: 170, label: "One primary owner", delay: 4.6 },
          ]}
          ticks={[
            { left: "62.5%", top: 38, height: 60, delay: 0.3 },
            { left: "37.5%", top: 126, height: 32, delay: 4 },
          ]}
        />
      </GxCard>
    </>
  );
}

export function PolicyForkVisual() {
  return (
    <>
      <GxNoiseFilter id="gxNe" />
      <GxCard filterId="gxNe" title="A prepared action meets policy">
        <GxBranch
          nodes={[
            { key: "prepared", left: "50%", top: 34, label: "Prepared action", top2: true, delay: 0 },
            { key: "execute", left: "16.6%", top: 150, label: "Execute within policy" },
            { key: "hold", left: "50%", top: 150, label: "Hold for approval", amber: true, delay: 2 },
            { key: "stop", left: "83.3%", top: 150, label: "Stop if not allowed" },
          ]}
          ticks={[
            { left: "16.6%", top: 66, height: 84, delay: 0.3 },
            { left: "50%", top: 66, height: 84, delay: 0.3 },
            { left: "83.3%", top: 66, height: 84, delay: 0.3 },
          ]}
        />
      </GxCard>
    </>
  );
}
