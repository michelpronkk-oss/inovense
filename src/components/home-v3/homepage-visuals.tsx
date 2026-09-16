// Production implementations of the approved Claude Design homepage visuals,
// reproduced from "Auterim Visual Kit.html". Styles live in
// ./homepage-visuals.css, scoped under the hv- prefix so they cannot collide
// with the surrounding page CSS.

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/**
 * Shared SVG defs mounted once for the whole page: the "mk" logomark symbol
 * (referenced by every glass badge below via <use href="#mk"/>) and the
 * per-section feTurbulence grain filters. Rendering the raw <symbol>/<filter>
 * defs more than once on the same page would duplicate ids, so this must only
 * ever be mounted a single time (see v3-page.tsx).
 */
export function VisualDefs() {
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="mk" viewBox="0 0 64 64">
            <g fill="currentColor">
              <path fillRule="evenodd" d="M32,4 L57,49 Q32,40 7,49 Z M32,21 L41,37 Q32,34 23,37 Z" />
              <path d="M10,58 Q32,50 54,58 Q32,54.5 10,58 Z" />
            </g>
          </symbol>
        </defs>
      </svg>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="heroN"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" /></filter>
          <filter id="oplN"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" /></filter>
          <filter id="stkN"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" /></filter>
          <filter id="ovN"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" /></filter>
          <filter id="gxN"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" /></filter>
          <filter id="rdN"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={3} stitchTiles="stitch" /></filter>
        </defs>
      </svg>
    </>
  );
}

/** The glass-chip mark badge (halo pulse + `#mk` logomark) used in every panel header. */
function MarkBadge({ size, radius, icon }: { size: number; radius: number; icon: number }) {
  const style = {
    "--hv-badge-size": `${size}px`,
    "--hv-badge-radius": `${radius}px`,
    "--hv-badge-icon": `${icon}px`,
  } as CSSProperties;
  return (
    <span className="hv-badge" style={style} aria-hidden="true">
      <svg viewBox="0 0 64 64"><use href="#mk" /></svg>
    </span>
  );
}

/** The grid + bloom + vignette + scan-edge layers behind every panel's content. */
function PanelDepth() {
  return (
    <>
      <div className="hv-grid" aria-hidden="true" />
      <div className="hv-bloom" aria-hidden="true" />
      <div className="hv-vig" aria-hidden="true" />
      <div className="hv-edge" aria-hidden="true" />
    </>
  );
}

/** The animated grain overlay, painted last so it reads across the panel's content too. */
function PanelGrain({ grainFilter }: { grainFilter: string }) {
  return (
    <div className="hv-grain" aria-hidden="true">
      <svg viewBox="0 0 216 216" preserveAspectRatio="none"><rect width="216" height="216" filter={`url(#${grainFilter})`} /></svg>
    </div>
  );
}

const ARROW = <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden><path d="M4 12h14M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const GMAIL_ICON = <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M4 8l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const HUBSPOT_ICON = <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="10" r="2.9" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="17.8" r="2.4" stroke="currentColor" strokeWidth="1.5" /><path d="M12 12.9v2.5M18 4.4l-3.3 3.4M20.6 6.2h-2.8M20.6 6.2V3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;

export function WhyAuterimVisual() {
  return (
    <div className="hv-opl" role="img" aria-label="No one had to ask. Auterim reads the systems you already run, recognizes what changed, and prepares the move that change calls for. No prompt, no workflow built by hand. Example: an inbox pricing question on an open deal has approval held; a CRM deal untouched for eleven days is preparing.">
      <PanelDepth />
      <div className="hv-opl-main">
        <div className="hv-opl-rail">
          <MarkBadge size={52} radius={15} icon={24} />
        </div>
        <div className="hv-opl-right">
          <h3 className="hv-opl-h">No one had to ask.</h3>
          <div className="hv-opl-sub">Auterim reads the systems you already run, recognizes what changed, and prepares the move that change calls for.</div>
          <div className="hv-opl-claim">No prompt. No workflow built by hand.</div>
          <div className="hv-ledger">
            <div className="hv-lg">
              <span className="hv-chip hv-lg-ic" style={{ color: "#EA4335" }} aria-hidden="true">{GMAIL_ICON}</span>
              <div className="hv-lg-body">
                <div className="hv-lg-src"><span className="hv-dot hv-dot-cy hv-pulse" />Inbox</div>
                <div className="hv-lg-t">Pricing question on an open deal</div>
              </div>
              <div className="hv-lg-st hv-am">Approval held</div>
            </div>
            <div className="hv-lg">
              <span className="hv-chip hv-lg-ic" style={{ color: "#FF7A59" }} aria-hidden="true">{HUBSPOT_ICON}</span>
              <div className="hv-lg-body">
                <div className="hv-lg-src"><span className="hv-dot hv-dot-cy hv-pulse hv-d1" />CRM</div>
                <div className="hv-lg-t">Deal untouched for eleven days</div>
              </div>
              <div className="hv-lg-st">Preparing</div>
            </div>
          </div>
        </div>
      </div>
      <PanelGrain grainFilter="oplN" />
    </div>
  );
}

const CONNECTORS: { name: string; color?: string; icon: ReactNode; pulse?: string }[] = [
  {
    name: "Gmail",
    color: "#EA4335",
    icon: GMAIL_ICON,
    pulse: "",
  },
  {
    name: "HubSpot",
    color: "#FF7A59",
    icon: HUBSPOT_ICON,
    pulse: "hv-d2",
  },
  {
    name: "Google Drive",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M8.6 3.4h6.8l6 10.6h-6.8z" fill="#00AC47" /><path d="M2.6 14 6 20.6h12l-3.4-6.6z" fill="#FFBA00" /><path d="M8.6 3.4 2.6 14l3.4 6.6 6-10.6z" fill="#2684FC" /></svg>,
  },
  {
    name: "Slack",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="10" width="8" height="4" rx="2" fill="#36C5F0" /><rect x="13" y="10" width="8" height="4" rx="2" fill="#2EB67D" /><rect x="10" y="3" width="4" height="8" rx="2" fill="#ECB22E" /><rect x="10" y="13" width="4" height="8" rx="2" fill="#E01E5A" /></svg>,
  },
  {
    name: "Trello",
    color: "#2684FC",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" stroke="currentColor" strokeWidth="1.5" /><rect x="6.8" y="6.8" width="4.4" height="9" rx="1" fill="currentColor" fillOpacity=".55" /><rect x="13.2" y="6.8" width="4" height="5.4" rx="1" fill="currentColor" fillOpacity=".55" /></svg>,
  },
  {
    name: "Microsoft 365",
    color: "#5B8DEF",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6.6 11.4 4v16L4 17.4z" fill="currentColor" fillOpacity=".6" /><path d="M13 5.2 20 3.4v17.2L13 18.8z" fill="currentColor" fillOpacity=".3" /></svg>,
  },
  {
    name: "Asana",
    color: "#F2767C",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="7.2" cy="8.4" r="2.5" fill="currentColor" /><circle cx="16.8" cy="8.4" r="2.5" fill="currentColor" /><circle cx="12" cy="16.6" r="2.5" fill="currentColor" /></svg>,
  },
  {
    name: "Jira",
    color: "#2684FC",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3.4 20.6 12 12 20.6 3.4 12z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="2.6" fill="currentColor" fillOpacity=".5" /></svg>,
  },
  {
    name: "Zendesk",
    color: "#51D88A",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 19.4 19.4 4v15.4z" fill="currentColor" fillOpacity=".45" /><path d="M4 4h11L4 15z" fill="currentColor" fillOpacity=".8" /></svg>,
  },
];

const STACK_STEPS: { key: string; text: string; gate?: boolean }[] = [
  { key: "Signal", text: "Something changes in a connected system." },
  { key: "Joined context", text: "History and ownership are joined to the signal." },
  { key: "Operator-ready", text: "A prepared next move is held at your approval boundary.", gate: true },
];

export function ConnectorsVisual() {
  return (
    <div className="hv-stk">
      <PanelDepth />
      <div className="hv-stk-main">
        <div className="hv-stk-l">
          <div className="hv-stk-head"><span className="hv-lab">Connects to</span><span className="hv-lab hv-stk-count">9 systems</span></div>
          <div className="hv-cn-grid">
            {CONNECTORS.map((c) => (
              <span className="hv-cn" key={c.name}>
                <span className="hv-chip hv-cn-ic" style={c.color ? { color: c.color } : undefined}>{c.icon}</span>
                <span className="hv-cn-nm">{c.name}</span>
                {c.pulse !== undefined && <span className={`hv-dot hv-dot-cy hv-pulse ${c.pulse}`} aria-hidden="true" />}
              </span>
            ))}
          </div>
          <div className="hv-cn-foot"><Link href="/connectors" className="hv-cn-more">See supported connectors <span aria-hidden="true">{ARROW}</span></Link></div>
        </div>

        <div className="hv-stk-r">
          <div className="hv-stk-top">
            <MarkBadge size={44} radius={13} icon={20} />
            <span className="hv-lab hv-st" aria-hidden="true"><span className="hv-dot hv-dot-cy hv-pulse" />Reading connected systems</span>
          </div>
          <h3 className="hv-stk-h">Your systems stay the source of truth.</h3>
          <p className="hv-stk-sub">Auterim joins the context and hands the right operator work that is already prepared.</p>
          <div className="hv-steps">
            <div className="hv-sp hv-sp1"><span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /></span><span><span className="hv-sp-k">Signal</span><span className="hv-sp-t">Something changes in a connected system.</span></span></div>
            <div className="hv-sp hv-sp2"><span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /></span><span><span className="hv-sp-k">Joined context</span><span className="hv-sp-t">History and ownership are joined to the signal.</span></span></div>
            <div className="hv-sp hv-sp3 hv-gate"><span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /></span><span><span className="hv-sp-k">Operator-ready</span><span className="hv-sp-t">A prepared next move is held at your approval boundary.</span></span></div>
          </div>
        </div>
      </div>

      <div className="hv-stk-mobile">
        <div className="hv-stk-m-top">
          <MarkBadge size={36} radius={11} icon={17} />
          <span className="hv-lab hv-st"><span className="hv-dot hv-dot-cy hv-pulse" />Reading connected systems</span>
        </div>
        <h3 className="hv-stk-h">Your systems stay the source of truth.</h3>
        <p className="hv-stk-sub">Auterim joins the context and hands the right operator work that is already prepared.</p>
        <div className="hv-steps">
          {STACK_STEPS.map((step, i) => (
            <div className={`hv-sp hv-sp${i + 1}${step.gate ? " hv-gate" : ""}`} key={step.key}>
              <span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /></span>
              <span><span className="hv-sp-k">{step.key}</span><span className="hv-sp-t">{step.text}</span></span>
            </div>
          ))}
        </div>
        <div className="hv-stk-m-div" aria-hidden="true" />
        <div className="hv-stk-m-row"><span className="hv-lab">Connects to</span><span className="hv-lab hv-stk-count">9 systems</span></div>
        <div className="hv-stk-m-cn-wrap">
          <div className="hv-stk-m-cn-track">
            {[...CONNECTORS, ...CONNECTORS].map((c, i) => (
              <span className="hv-stk-m-cn" key={`${c.name}-${i}`} aria-hidden={i >= CONNECTORS.length || undefined}>
                <span className="hv-chip hv-cn-ic" style={{ "--hv-chip-size": "22px", "--hv-chip-radius": "7px", ...(c.color ? { color: c.color } : {}) } as CSSProperties}>{c.icon}</span>
                <span className="hv-cn-nm">{c.name}</span>
                {c.pulse !== undefined && <span className={`hv-dot hv-dot-cy hv-pulse ${c.pulse}`} aria-hidden="true" />}
              </span>
            ))}
          </div>
        </div>
        <Link href="/connectors" className="hv-cn-more">See supported connectors <span aria-hidden="true">{ARROW}</span></Link>
      </div>

      <PanelGrain grainFilter="stkN" />
    </div>
  );
}

export function OutcomesVisual() {
  return (
    <div className="hv-ov" role="img" aria-label="Operational view. One clear next move. A follow-up that was sitting unnoticed is surfaced with its owner and context, then prepared for approval.">
      <PanelDepth />
      <div className="hv-ov-in">
        <div className="hv-ov-top">
          <MarkBadge size={40} radius={12} icon={18} />
          <span className="hv-lab hv-st">Operational view</span>
        </div>
        <h3 className="hv-ov-h">One clear next move.</h3>
        <p className="hv-ov-sub">A follow-up sitting unnoticed arrives with its owner and context, ready for the next move.</p>
        <div className="hv-marks">
          <div className="hv-mk-r hv-r1"><span className="hv-mk-n"><span className="hv-dot" aria-hidden="true" /></span><span className="hv-mk-t">Follow-up surfaced</span></div>
          <div className="hv-mk-r hv-r2"><span className="hv-mk-n"><span className="hv-dot" aria-hidden="true" /></span><span className="hv-mk-t">Owner and context ready</span></div>
          <div className="hv-mk-r hv-r3"><span className="hv-mk-n"><span className="hv-dot" aria-hidden="true" /></span><span className="hv-mk-t">Prepared reply held for approval</span></div>
        </div>
      </div>
      <PanelGrain grainFilter="ovN" />
    </div>
  );
}

const CHECK_TICK = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const CONTROL_STAGES: { key: string; title: string; desc: string; gate?: boolean }[] = [
  { key: "Context", title: "Scoped access", desc: "Only the systems and permissions you connect." },
  { key: "Policy", title: "Your rules applied", desc: "What an operator may prepare, route or send." },
  { key: "Approval", title: "The human gate", desc: "Sensitive actions wait for a named approver.", gate: true },
  { key: "Execute", title: "Inside the boundary", desc: "Nothing runs outside what was approved." },
  { key: "Outcome", title: "Recorded in full", desc: "What was detected, prepared, approved and run." },
];

const GX_CHECK_ICON = <svg viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5 9.5 17 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const GX_LOCK_ICON = <svg viewBox="0 0 24 24" fill="none" aria-hidden><rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;

export function ControlVisual() {
  return (
    <div className="hv-gx" role="img" aria-label="Governed execution. Context: scoped access, only the systems and permissions you connect. Policy: your rules applied, what an operator may prepare, route or send. Approval: the human gate, sensitive actions wait for a named approver. Execute: inside the boundary, nothing runs outside what was approved. Outcome: recorded in full, what was detected, prepared, approved and run. Every stage logged. Approval required by default.">
      <PanelDepth />
      <div className="hv-gx-top" aria-hidden="true">
        <MarkBadge size={44} radius={13} icon={20} />
        <div className="hv-lab hv-st">Governed execution</div>
      </div>
      <div className="hv-gx-stages" aria-hidden="true">
        {CONTROL_STAGES.map((stage, i) => (
          <div key={stage.key} className={`hv-gx-s hv-gx-s${i + 1}${stage.gate ? " hv-gx-gate" : ""}`}>
            <div className="hv-gx-line"><i /></div>
            <div className="hv-gx-kr"><span className="hv-dot" /><div className="hv-gx-k">{stage.key}</div></div>
            <div className="hv-gx-t">{stage.title}</div>
            <div className="hv-gx-x">{stage.desc}</div>
          </div>
        ))}
      </div>
      <div className="hv-gx-rail-mobile" aria-hidden="true">
        {CONTROL_STAGES.map((stage, i) => (
          <div key={stage.key} className={`hv-gx-ms hv-gx-ms${i + 1}${stage.gate ? " hv-gx-gate-m" : ""}`}>
            <div className="hv-gx-spine"><span className="hv-dot" /></div>
            <div className="hv-gx-mcard">
              <div className="hv-gx-k">{stage.key}</div>
              <div className="hv-gx-t">{stage.title}</div>
              <div className="hv-gx-x">{stage.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="hv-gx-foot" aria-hidden="true">
        <div className="hv-gx-pill">Every stage logged</div>
        <div className="hv-gx-pill hv-am">Approval required by default</div>
      </div>
      <div className="hv-gx-foot-mobile" aria-hidden="true">
        <div className="hv-gx-foot-row"><span className="hv-gx-foot-ic">{GX_CHECK_ICON}</span><span>Every stage logged</span></div>
        <div className="hv-gx-foot-row hv-am"><span className="hv-gx-foot-ic">{GX_LOCK_ICON}</span><span>Approval required by default</span></div>
      </div>
      <PanelGrain grainFilter="gxN" />
    </div>
  );
}

export function FinalCtaVisual() {
  return (
    <div className="hv-rd" role="img" aria-label="First operator: Revenue Operator, ready. Context connected. Approval boundary set. First signal ready. Everything is set, you can start.">
      <PanelDepth />
      <div className="hv-rd-in">
        <div className="hv-rd-top" aria-hidden="true">
          <MarkBadge size={38} radius={11} icon={17} />
          <div className="hv-lab hv-st">First operator</div>
        </div>
        <div className="hv-rd-op" aria-hidden="true">
          <span className="hv-rd-av">
            <svg width="22" height="22" viewBox="0 0 24 24" style={{ color: "var(--hv-cyan)" }} aria-hidden>
              <circle cx="12" cy="8.4" r="3.4" fill="currentColor" />
              <path d="M4.8 20.4c0-3.9 3.2-7.1 7.2-7.1s7.2 3.2 7.2 7.1z" fill="currentColor" />
            </svg>
            <span className="hv-rd-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M13 3 5 13h5l-1 8 8-10h-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            </span>
          </span>
          <span>
            <div className="hv-rd-nm">Revenue Operator</div>
            <div className="hv-rd-rl">Ready</div>
          </span>
        </div>
        <div className="hv-rd-checks" aria-hidden="true">
          <div className="hv-rd-c hv-rd-c1">{CHECK_TICK}<div className="hv-rd-ct">Context connected</div></div>
          <div className="hv-rd-c hv-rd-c2">{CHECK_TICK}<div className="hv-rd-ct">Approval boundary set</div></div>
          <div className="hv-rd-c hv-rd-c3">{CHECK_TICK}<div className="hv-rd-ct">First signal ready</div></div>
        </div>
        <div className="hv-rd-go" aria-hidden="true">
          <span className="hv-dot hv-dot-cy hv-pulse" />
          <div className="hv-rd-go-txt">Everything is set. You can start.</div>
        </div>
      </div>
      <PanelGrain grainFilter="rdN" />
    </div>
  );
}
