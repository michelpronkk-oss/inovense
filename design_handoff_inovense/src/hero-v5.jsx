// Inovense — Hero v5
// Built to a strict spec: 2-column, 6-card control plane, enterprise restraint.

const { useState: useStateV5, useEffect: useEffectV5 } = React;

// =========================================================
// Layered OS Stack — three glass cards floating in 3D space
// Shows the operating layer literally: stacked product views
// =========================================================
const LayeredStack = () => {
  const [run, setRun] = useStateV5(4812);
  const [el, setEl] = useStateV5(14);
  useEffectV5(() => {
    const tick = setInterval(() => setEl((e) => e + 1), 1000);
    const rot = setInterval(() => { setRun((r) => r + 1); setEl(0); }, 18000);
    return () => { clearInterval(tick); clearInterval(rot); };
  }, []);
  const mm = String(Math.floor(el / 60)).padStart(1, "0");
  const ss = String(el % 60).padStart(2, "0");

  return (
    <div className="ls">
      <div className="ls-bg-grid" />
      <div className="ls-bg-glow" />

      {/* Back layer — audit log */}
      <div className="ls-card ls-back">
        <div className="ls-card-rail">
          <span className="ls-rail-tag">audit log</span>
          <span className="ls-rail-meta">policy + approvals</span>
        </div>
        <div className="ls-log">
          {[
            { lvl: "ok",   t: "14:02", a: "Revenue",   m: "approval requested · awaiting review" },
            { lvl: "ok",   t: "14:01", a: "Marketing", m: "published Q3 brief · 1,420w" },
            { lvl: "info", t: "13:58", a: "Client",    m: "onboarding kit · Northwind" },
            { lvl: "warn", t: "13:54", a: "Revenue",   m: "memory.miss · template fallback" },
            { lvl: "ok",   t: "13:47", a: "Ops",       m: "weekly digest scheduled" },
          ].map((e, i) => (
            <div key={i} className="ls-log-row">
              <span className="ls-log-t">{e.t}</span>
              <span className={`ls-log-lvl ls-log-${e.lvl}`}>{e.lvl}</span>
              <span className="ls-log-a">[{e.a}]</span>
              <span className="ls-log-m">{e.m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Middle layer — memory graph */}
      <div className="ls-card ls-mid">
        <div className="ls-card-rail">
          <span className="ls-rail-tag">memory · indexed</span>
          <span className="ls-rail-meta">14,392 entities</span>
        </div>
        <div className="ls-memory">
          <div className="ls-mem-node ls-mem-center">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="#4DE8E1">
              <rect x="5" y="5" width="22" height="4.5"/>
              <rect x="13" y="9.5" width="6" height="6"/>
              <rect x="13" y="16.5" width="6" height="6"/>
              <rect x="5" y="22.5" width="22" height="4.5"/>
            </svg>
          </div>
          <span className="ls-mem-node ls-mem-tl">Northwind Co.</span>
          <span className="ls-mem-node ls-mem-tr">$184k opp</span>
          <span className="ls-mem-node ls-mem-bl">MSA-v4.pdf</span>
          <span className="ls-mem-node ls-mem-br">Aiko Tanaka</span>
          <svg className="ls-mem-lines" viewBox="0 0 100 60" preserveAspectRatio="none">
            <g stroke="rgba(77,232,225,0.35)" strokeWidth="0.4" fill="none">
              <line x1="50" y1="30" x2="14" y2="14" />
              <line x1="50" y1="30" x2="86" y2="14" />
              <line x1="50" y1="30" x2="14" y2="46" />
              <line x1="50" y1="30" x2="86" y2="46" />
            </g>
          </svg>
        </div>
      </div>

      {/* Front layer — live approval */}
      <div className="ls-card ls-front">
        <div className="ls-card-rail">
          <span className="ls-rail-live"><span className="ls-rail-dot" /> workflow preview</span>
          <span className="ls-rail-meta">awaiting approval</span>
        </div>
        <div className="ls-approval">
          <div className="ls-appr-top">
            <span className="ls-appr-avatar">RV</span>
            <div>
              <div className="ls-appr-name">Revenue Operator</div>
              <div className="ls-appr-meta">drafting reply · Aiko Tanaka</div>
            </div>
            <span className="ls-appr-status">awaiting</span>
          </div>
          <div className="ls-appr-body">
            "Hi Aiko — thanks for the intro. Based on our prior work
            with <span className="ls-hl">Acme Industries</span> (similar Series B),
            I'd recommend a 30-min discovery. <span className="ls-hl">Tuesday 2pm PT</span> work?"
          </div>
          <div className="ls-appr-foot">
            <button className="ls-btn ls-btn-primary">Approve</button>
            <button className="ls-btn ls-btn-ghost">Edit</button>
            <button className="ls-btn ls-btn-ghost">Skip</button>
            <span className="ls-kbd">⌘ ↵</span>
          </div>
        </div>
      </div>

      {/* Cyan beam connecting layers */}
      <div className="ls-beam" />
    </div>
  );
};
const POLICY_CHECKS = [
  { ok: true,  text: "Recipient in allow-list",      tail: "northwind.com" },
  { ok: true,  text: "No PII outside whitelisted fields" },
  { ok: true,  text: "Spend per send under $0.40 limit" },
  { ok: false, text: "First contact in 14 days",      tail: "requires approval" },
];

const APPROVAL_BODY = "Hi Aiko — thanks for the intro. Based on our prior work with Acme Industries (similar Series B operating shape), I'd recommend kicking off with a 30-min discovery and a tailored ops audit. Could Tuesday 2pm PT work?";

const ApprovalHero = () => {
  const [run, setRun] = useStateV5(4812);
  const [el, setEl] = useStateV5(14);
  const [typed, setTyped] = useStateV5("");
  const [checks, setChecks] = useStateV5(0);

  // Typewriter
  useEffectV5(() => {
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(APPROVAL_BODY.slice(0, i));
      if (i >= APPROVAL_BODY.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [run]);

  // Stagger policy checks
  useEffectV5(() => {
    setChecks(0);
    const id = setInterval(() => {
      setChecks((c) => {
        if (c >= POLICY_CHECKS.length) { clearInterval(id); return c; }
        return c + 1;
      });
    }, 320);
    return () => clearInterval(id);
  }, [run]);

  // Live timer
  useEffectV5(() => {
    const tick = setInterval(() => setEl((e) => e + 1), 1000);
    const rot = setInterval(() => { setRun((r) => r + 1); setEl(0); }, 22000);
    return () => { clearInterval(tick); clearInterval(rot); };
  }, []);

  const mm = String(Math.floor(el / 60)).padStart(1, "0");
  const ss = String(el % 60).padStart(2, "0");

  return (
    <div className="ah">
      <div className="ah-floor" />
      <div className="ah-bg-glow" />

      {/* Ambient micro-cards */}
      <div className="ah-micro ah-micro-tl">
        <span className="ah-micro-dot" />
        <span className="ah-micro-label">Memory</span>
        <span className="ah-micro-meta">14k entities</span>
      </div>
      <div className="ah-micro ah-micro-br">
        <span className="ah-micro-dot" />
        <span className="ah-micro-label">Audit</span>
        <span className="ah-micro-meta">8.4k / day</span>
      </div>

      {/* Main approval card */}
      <div className="ah-card">
        <div className="ah-card-head">
          <div className="ah-card-head-left">
            <span className="ah-live"><span className="ah-live-dot" /> Live</span>
            <span className="ah-divider" />
            <span className="ah-run">run #{run.toLocaleString()}</span>
            <span className="ah-divider" />
            <span className="ah-time">0:{mm}:{ss}</span>
          </div>
          <span className="ah-status">Awaiting approval</span>
        </div>

        <div className="ah-card-body">
          <div className="ah-section">
            <div className="ah-section-label">Proposed action</div>
            <div className="ah-action">
              <span className="ah-action-avatar">RV</span>
              <div className="ah-action-text">
                <div className="ah-action-line">
                  <strong>Revenue Operator</strong> · send reply to
                </div>
                <div className="ah-action-target">Aiko Tanaka · Northwind Co.</div>
              </div>
            </div>
          </div>

          <div className="ah-section">
            <div className="ah-section-label">Draft</div>
            <div className="ah-draft">
              {typed}<span className="ah-caret" />
            </div>
          </div>

          <div className="ah-section">
            <div className="ah-section-label">Policy checks</div>
            <ul className="ah-checks">
              {POLICY_CHECKS.map((c, i) => (
                <li key={i} className={`ah-check ${i < checks ? "in" : ""} ${c.ok ? "ok" : "warn"}`}>
                  <span className="ah-check-ico">
                    {c.ok ? <I.check size={10} /> : <span className="ah-check-bang">!</span>}
                  </span>
                  <span className="ah-check-text">{c.text}</span>
                  {c.tail && <span className="ah-check-tail">{c.tail}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ah-card-foot">
          <button className="ah-btn ah-btn-primary">Approve &amp; send</button>
          <button className="ah-btn ah-btn-ghost">Edit</button>
          <button className="ah-btn ah-btn-ghost">Skip</button>
          <span className="ah-kbd">⌘ ↵</span>
        </div>
      </div>
    </div>
  );
};

// =========================================================
// Hero
// =========================================================
const HeroV5 = ({ mobileFrame = false }) => {
  const [email, setEmail] = useStateV5("");
  return (
    <section className={`hv5 ${mobileFrame ? "hv5-mobile-frame" : ""}`} id="top">
      <div className="hv5-bg-grid" />
      <div className="hv5-bg-vignette" />

      <div className="hv5-inner">
        <div className="hv5-content">
          <a href="#changelog" className="hv5-pill fade-in">
            <span className="hv5-pill-chip"><span className="dot dot-cyan pulsing" /> New</span>
            <span className="hv5-pill-text">Workflow approvals 2.0</span>
            <I.arrow size={11} />
          </a>

          <h1 className="hv5-h1 fade-in" style={{ animationDelay: ".06s" }}>
            AI operators that execute real business work<span className="hv5-period">.</span>
          </h1>

          <p className="hv5-sub fade-in" style={{ animationDelay: ".12s" }}>
            Connect your tools, set approvals and let operators prepare, route and execute work safely.
          </p>

          <div className="hv5-ctas fade-in" style={{ animationDelay: ".18s" }}>
            <a href="#start" className="hv5-cta hv5-cta-primary">
              Start preview <I.arrow size={13} />
            </a>
            <a href="#platform" className="hv5-cta hv5-cta-ghost">
              View platform
            </a>
          </div>

          <p className="hv5-note fade-in" style={{ animationDelay: ".21s" }}>
            Preview the workspace. Connect real tools when ready.
          </p>

        </div>

        <div className="hv5-art fade-in" style={{ animationDelay: ".30s" }}>
          <LayeredStack />
        </div>
      </div>

      <style>{`
        /* ============================================================
           Inovense Hero v5 — strict enterprise spec
           ============================================================ */
        .hv5 {
          position: relative;
          padding: 120px 32px 64px;
          min-height: 760px;
          display: flex;
          align-items: center;
          overflow: hidden;
          isolation: isolate;
        }
        .hv5-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 70% 60% at 60% 50%, #000 30%, transparent 95%);
          pointer-events: none;
          z-index: -2;
        }
        .hv5-bg-vignette {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 50% 35% at 50% 100%, rgba(8,10,14,0.65), transparent 60%);
          pointer-events: none;
          z-index: -1;
        }

        .hv5-inner {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 560px) minmax(0, 560px);
          gap: 56px;
          align-items: center;
        }

        /* ============ LEFT: content ============ */
        .hv5-content {
          min-width: 0;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .hv5-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 5px 12px 5px 5px;
          background: rgba(13,16,21,0.72);
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px var(--line);
          backdrop-filter: blur(10px);
          font-size: 12.5px;
          color: var(--text-dim);
          margin-bottom: 28px;
          transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
          max-width: 100%;
          overflow: hidden;
        }
        .hv5-pill:hover {
          background: rgba(13,16,21,0.92);
          box-shadow: inset 0 0 0 1px var(--line-2);
          transform: translateY(-1px);
        }
        .hv5-pill-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 2.5px 9px;
          background: var(--cyan-soft);
          color: var(--cyan);
          border-radius: 999px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: inset 0 0 0 1px var(--cyan-line);
          flex: none;
        }
        .hv5-pill-text {
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hv5-pill svg { color: var(--text-mute); flex: none; }

        .hv5-h1 {
          font-family: var(--font-sans);
          font-size: clamp(48px, 6vw, 88px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          font-weight: 500;
          color: var(--text);
          margin: 0 0 24px;
          max-width: 620px;
          text-wrap: balance;
        }
        .hv5-period { color: var(--cyan); }

        .hv5-sub {
          font-size: 17px;
          line-height: 1.55;
          color: var(--text-dim);
          max-width: 520px;
          margin: 0 0 32px;
          text-wrap: pretty;
        }

        .hv5-ctas {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        .hv5-note {
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.5;
          letter-spacing: 0.01em;
          color: var(--text-mute);
          margin: 0 0 36px;
        }
        .hv5-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          font-size: 14.5px;
          font-weight: 500;
          border-radius: 10px;
          letter-spacing: -0.003em;
          transition: all .15s ease;
          white-space: nowrap;
          text-decoration: none;
          cursor: pointer;
          border: none;
        }
        .hv5-cta-primary {
          background: var(--cyan);
          color: #04130F;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.4),
            0 8px 28px -8px rgba(77,232,225,0.55);
        }
        .hv5-cta-primary:hover {
          background: var(--cyan-bright);
          transform: translateY(-1px);
        }
        .hv5-cta-ghost {
          background: rgba(255,255,255,0.025);
          color: var(--text);
          box-shadow: inset 0 0 0 1px var(--line-2);
        }
        .hv5-cta-ghost:hover {
          background: rgba(255,255,255,0.06);
          box-shadow: inset 0 0 0 1px var(--line-strong);
        }

        .hv5-trust { width: 100%; min-width: 0; }
        .hv5-trust-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-mute);
          margin-bottom: 12px;
        }
        .hv5-trust-logos {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
        .hv5-trust-logos span {
          color: var(--text-faint);
          transition: color .15s ease;
        }
        .hv5-trust-logos span:hover { color: var(--text-mute); }

        /* ============ RIGHT: control plane ============ */
        .hv5-art {
          position: relative;
          width: 100%;
          min-width: 0;
          max-width: 560px;
          margin-left: auto;
        }

        .cp {
          position: relative;
          width: 100%;
          aspect-ratio: 14 / 11;
          padding: 32px 24px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(13,16,21,0.55), rgba(7,9,12,0.4));
          box-shadow: inset 0 0 0 1px var(--line);
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 16px;
          align-items: center;
          overflow: hidden;
        }
        .cp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%);
          pointer-events: none;
        }
        .cp-glow {
          position: absolute;
          left: 50%; top: 50%;
          width: 220px; height: 220px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(77,232,225,0.18), transparent 60%);
          filter: blur(20px);
          pointer-events: none;
        }
        .cp-lines {
          position: absolute;
          inset: 0;
          width: 100%; height: 100%;
          pointer-events: none;
        }

        .cp-col {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .cp-col-label {
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-mute);
          margin-bottom: 2px;
        }
        .cp-left { align-items: flex-start; }
        .cp-right { align-items: flex-end; }
        .cp-right .cp-col-label { color: var(--cyan); opacity: 0.85; }

        /* Card */
        .pc {
          position: relative;
          width: 100%;
          max-width: 150px;
          min-width: 0;
          padding: 10px 12px;
          background: linear-gradient(180deg, #0F1218, #0A0D13);
          border-radius: 10px;
          box-shadow: inset 0 0 0 1px var(--line);
          overflow: hidden;
          transition: box-shadow .15s ease, transform .15s ease;
        }
        .pc-accent {
          background: linear-gradient(180deg, rgba(14,22,24,0.95), rgba(8,14,16,0.95));
          box-shadow: inset 0 0 0 1px rgba(77,232,225,0.28);
        }
        .pc-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .pc-dot {
          flex: none;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--text-mute);
        }
        .pc-accent .pc-dot { background: var(--cyan); box-shadow: 0 0 6px var(--cyan); }
        .pc-dot-pulse { animation: pulseDot 1.8s ease-in-out infinite; }
        .pc-label {
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          letter-spacing: -0.005em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .pc-accent .pc-label { color: var(--cyan); }
        .pc-sub {
          display: block;
          margin-top: 4px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-faint);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Hub */
        .cp-hub {
          position: relative;
          z-index: 3;
          display: grid;
          place-items: center;
          min-width: 0;
        }
        .cp-hub-glow {
          position: absolute;
          inset: -40px;
          background:
            radial-gradient(circle, rgba(77,232,225,0.32), transparent 55%);
          filter: blur(24px);
          pointer-events: none;
        }
        .cp-hub-glow::after {
          content: "";
          position: absolute;
          left: 50%; top: 50%;
          width: 140px; height: 140px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 1px solid rgba(77,232,225,0.20);
          animation: cpRing 3.2s ease-out infinite;
        }
        @keyframes cpRing {
          0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        .cp-hub-card {
          position: relative;
          width: 100%;
          max-width: 200px;
          padding: 22px 18px 18px;
          background: linear-gradient(180deg, #11181E, #060B0E);
          border-radius: 16px;
          box-shadow:
            inset 0 0 0 1px rgba(77,232,225,0.50),
            0 0 0 1px rgba(77,232,225,0.06),
            0 24px 60px -20px rgba(77,232,225,0.45),
            0 0 80px -20px rgba(77,232,225,0.25);
          text-align: center;
          overflow: hidden;
        }
        .cp-hub-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(180deg, rgba(77,232,225,0.7), rgba(77,232,225,0.1) 60%, transparent);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .cp-hub-mark {
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(77,232,225,0.08);
          box-shadow: inset 0 0 0 1px rgba(77,232,225,0.30);
          margin-left: auto;
          margin-right: auto;
        }
        .cp-hub-name {
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 15px;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .cp-hub-tag {
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: var(--cyan);
          letter-spacing: 0.10em;
          text-transform: uppercase;
          margin-top: 4px;
          margin-bottom: 14px;
        }
        .cp-hub-run {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 8px;
          background: rgba(77,232,225,0.06);
          border-radius: 7px;
          box-shadow: inset 0 0 0 1px rgba(77,232,225,0.18);
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: var(--text-dim);
          min-width: 0;
          overflow: hidden;
        }
        .cp-hub-run-dot {
          flex: none;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 6px var(--cyan);
          animation: pulseDot 1.6s ease-in-out infinite;
        }
        .cp-hub-run-text {
          color: var(--cyan);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cp-hub-run-time {
          color: var(--text-mute);
          font-variant-numeric: tabular-nums;
        }

        /* ============ RESPONSIVE ============ */
        @media (max-width: 880px) {
          .hv5-inner {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .hv5-content {
            max-width: 620px;
            margin: 0 auto;
            align-items: center;
            text-align: center;
          }
          .hv5-sub { margin-left: auto; margin-right: auto; }
          .hv5-trust-logos { justify-content: center; }
          .hv5-art { margin: 0 auto; max-width: 560px; }
        }
        @media (max-width: 720px) {
          .hv5 {
            padding: 96px 20px 56px;
            min-height: 0;
            align-items: flex-start;
          }
          .hv5-mobile-frame { padding-top: 96px; }
          .hv5-pill {
            font-size: 11.5px;
            padding: 4px 10px 4px 4px;
            margin-bottom: 22px;
          }
          .hv5-pill-chip { font-size: 9px; }
          .hv5-h1 {
            font-size: clamp(42px, 13vw, 58px);
            line-height: 1.0;
            letter-spacing: -0.035em;
            margin-bottom: 20px;
          }
          .hv5-sub {
            font-size: 16px;
            margin-bottom: 26px;
          }
          .hv5-ctas {
            flex-direction: column;
            width: 100%;
            gap: 8px;
            margin-bottom: 32px;
          }
          .hv5-cta {
            width: 100%;
            justify-content: center;
            padding: 13px 16px;
          }
          .hv5-trust-label { font-size: 9.5px; margin-bottom: 10px; }
          .hv5-trust-logos { gap: 14px; font-size: 10px; }
          .hv5-trust-logos span:nth-child(n+5) { display: none; }

          /* Visual: compact on mobile */
          .hv5-art { max-height: 360px; }
          .cp {
            aspect-ratio: auto;
            max-height: 360px;
            padding: 18px 14px;
            grid-template-columns: 1fr 1.2fr 1fr;
            gap: 8px;
          }
          .cp-col { gap: 8px; }
          .cp-col-label { display: none; }
          /* Show only 2 satellite cards per side on mobile */
          .cp-col .pc:nth-child(4) { display: none; }
          .pc {
            padding: 8px 10px;
            max-width: 100%;
          }
          .pc-label { font-size: 11.5px; }
          .pc-sub { font-size: 8.5px; }
          .cp-hub-card {
            padding: 14px 12px 12px;
            max-width: 140px;
          }
          .cp-hub-name { font-size: 12.5px; }
          .cp-hub-tag { font-size: 8.5px; margin-bottom: 10px; }
          .cp-hub-run { padding: 5px 7px; font-size: 8.5px; }
        }
        @media (max-width: 380px) {
          .hv5-h1 { font-size: 40px; }
        }
      `}</style>
    </section>
  );
};

Object.assign(window, { HeroV5, LayeredStack, ApprovalHero });
