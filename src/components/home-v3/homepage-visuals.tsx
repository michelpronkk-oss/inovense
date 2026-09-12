// Production implementations of the approved Claude Design homepage visuals,
// reproduced from "Auterim Visual Kit.html". Styles live in
// ./homepage-visuals.css, scoped under the hv- prefix so they cannot collide
// with the surrounding page CSS.

import Link from "next/link";

function Mark({ size = 24 }: { size?: number }) {
  return <img src="/brand/auterim-mark-live.svg" width={size} height={size} alt="" className="hv-mark" />;
}

const ARROW = <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden><path d="M4 12h14M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function WhyAuterimVisual() {
  return (
    <div className="hv-opl" role="img" aria-label="Finds the work before your team has to. It reads the systems you already run, recognises what changed, and prepares the move that change calls for. No prompt, no workflow built by hand. Example: an inbox pricing question on an open deal has approval held; a CRM deal untouched for eleven days is preparing.">
      <div className="hv-opl-tex" aria-hidden="true" />
      <div className="hv-opl-main" aria-hidden="true">
        <div className="hv-opl-rail">
          <Mark size={32} />
        </div>
        <div className="hv-opl-right">
          <h3 className="hv-opl-h">Finds the work before your team has to.</h3>
          <div className="hv-opl-sub">It reads the systems you already run, recognises what changed, and prepares the move that change calls for.</div>
          <div className="hv-opl-claim">No prompt. No workflow built by hand.</div>
          <div className="hv-ledger">
            <div className="hv-lg">
              <div>
                <div className="hv-lg-src"><span className="hv-dot hv-dot-cy hv-pulse" />Inbox</div>
                <div className="hv-lg-t">Pricing question on an open deal</div>
              </div>
              <div className="hv-lg-st hv-am">Approval held</div>
            </div>
            <div className="hv-lg">
              <div>
                <div className="hv-lg-src"><span className="hv-dot hv-dot-cy hv-pulse hv-d1" />CRM</div>
                <div className="hv-lg-t">Deal untouched for eleven days</div>
              </div>
              <div className="hv-lg-st">Preparing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CONNECTORS: { name: string; color?: string; icon: React.ReactNode; pulse?: string }[] = [
  {
    name: "Gmail",
    color: "#EA4335",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M4 8l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    pulse: "",
  },
  {
    name: "HubSpot",
    color: "#FF7A59",
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="10" r="2.9" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="17.8" r="2.4" stroke="currentColor" strokeWidth="1.5" /><path d="M12 12.9v2.5M18 4.4l-3.3 3.4M20.6 6.2h-2.8M20.6 6.2V3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
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

export function ConnectorsVisual() {
  return (
    <div className="hv-stk">
      <div className="hv-stk-tex" aria-hidden="true" />
      <div className="hv-stk-main">
        <div className="hv-stk-l">
          <div className="hv-stk-head"><span className="hv-lab">Connects to</span><span className="hv-lab hv-stk-count">9 systems</span></div>
          <div className="hv-cn-grid">
            {CONNECTORS.map((c) => (
              <span className="hv-cn" key={c.name}>
                <span className="hv-cn-ic" style={c.color ? { color: c.color } : undefined}>{c.icon}</span>
                <span className="hv-cn-nm">{c.name}</span>
                {c.pulse !== undefined && <span className={`hv-dot hv-dot-cy hv-pulse ${c.pulse}`} aria-hidden="true" />}
              </span>
            ))}
          </div>
          <div className="hv-cn-foot"><Link href="/integrations" className="hv-cn-more">See supported connectors <span aria-hidden="true">{ARROW}</span></Link></div>
        </div>

        <div className="hv-stk-r">
          <div className="hv-stk-top">
            <Mark size={24} />
            <span className="hv-lab hv-st" aria-hidden="true"><span className="hv-dot hv-dot-cy hv-pulse" />Reading connected systems</span>
          </div>
          <h3 className="hv-stk-h">Your systems stay the source of truth.</h3>
          <p className="hv-stk-sub">Auterim joins the context and hands the right operator work that is already prepared.</p>
          <div className="hv-steps">
            <div className="hv-sp hv-sp1"><span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /><i className="hv-ln" aria-hidden="true" /></span><span><span className="hv-sp-k">Signal</span><span className="hv-sp-t">Something changes in a connected system.</span></span></div>
            <div className="hv-sp hv-sp2"><span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /><i className="hv-ln hv-am" aria-hidden="true" /></span><span><span className="hv-sp-k">Joined context</span><span className="hv-sp-t">History and ownership are joined to the signal.</span></span></div>
            <div className="hv-sp hv-sp3 hv-gate"><span className="hv-sp-n"><span className="hv-dot" aria-hidden="true" /></span><span><span className="hv-sp-k">Operator-ready</span><span className="hv-sp-t">A prepared next move is held at your approval boundary.</span></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OutcomesVisual() {
  return (
    <div className="hv-ov" role="img" aria-label="Operational view. One clear next move. A follow-up that was sitting unnoticed is surfaced with its owner and context, then prepared for approval.">
      <div className="hv-ov-tex" aria-hidden="true" />
      <div className="hv-ov-in">
        <div className="hv-ov-top">
          <Mark size={24} />
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

export function ControlVisual() {
  return (
    <div className="hv-gx" role="img" aria-label="Governed execution. Context: scoped access, only the systems and permissions you connect. Policy: your rules applied, what an operator may prepare, route or send. Approval: the human gate, sensitive actions wait for a named approver. Execute: inside the boundary, nothing runs outside what was approved. Outcome: recorded in full, what was detected, prepared, approved and run. Every stage logged. Approval required by default.">
      <div className="hv-gx-tex" aria-hidden="true" />
      <div className="hv-gx-top" aria-hidden="true">
        <Mark size={24} />
        <div className="hv-lab hv-st">Governed execution</div>
      </div>
      <div className="hv-gx-stages" aria-hidden="true">
        {CONTROL_STAGES.map((stage, i) => (
          <div key={stage.key} className={`hv-gx-s hv-gx-s${i + 1}${stage.gate ? " hv-gx-gate" : ""}`}>
            <span className="hv-dot" />
            <div className="hv-gx-k">{stage.key}</div>
            <div className="hv-gx-t">{stage.title}</div>
            <div className="hv-gx-x">{stage.desc}</div>
          </div>
        ))}
      </div>
      <div className="hv-gx-foot" aria-hidden="true">
        <div>Every stage logged</div>
        <div className="hv-am">Approval required by default</div>
      </div>
    </div>
  );
}

export function FinalCtaVisual() {
  return (
    <div className="hv-rd" role="img" aria-label="First operator: Revenue Operator, ready. Context connected. Approval boundary set. First signal ready. Everything is set, you can start.">
      <div className="hv-rd-tex" aria-hidden="true" />
      <div className="hv-rd-in">
        <div className="hv-rd-top" aria-hidden="true">
          <Mark size={24} />
          <div className="hv-lab hv-st">First operator</div>
        </div>
        <div className="hv-rd-op" aria-hidden="true">
          <span className="hv-rd-av">
            <svg width="22" height="22" viewBox="0 0 24 24" style={{ color: "var(--hv-cyan)" }} aria-hidden>
              <circle cx="12" cy="8.4" r="3.4" fill="currentColor" />
              <path d="M4.8 20.4c0-3.9 3.2-7.1 7.2-7.1s7.2 3.2 7.2 7.1z" fill="currentColor" />
            </svg>
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
    </div>
  );
}
