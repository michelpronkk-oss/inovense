// Inovense — Trust / scale sections: integrations, security, onboarding, pricing, CTA, footer

// ============================================================================
// 7. Integrations / connectors
// ============================================================================
const IntegrationsSection = () => {
  const tiles = [
    { name: "Salesforce", kind: "CRM", color: "#00A1E0", letter: "SF" },
    { name: "HubSpot",    kind: "CRM", color: "#FF7A59", letter: "HS" },
    { name: "Gmail",      kind: "Inbox", color: "#EA4335", letter: "G" },
    { name: "Outlook",    kind: "Inbox", color: "#0078D4", letter: "O" },
    { name: "Slack",      kind: "Comms", color: "#4A154B", letter: "Sl" },
    { name: "Notion",     kind: "Docs", color: "#FFFFFF", letter: "N" },
    { name: "Linear",     kind: "Work", color: "#5E6AD2", letter: "L" },
    { name: "Stripe",     kind: "Payments", color: "#635BFF", letter: "S" },
    { name: "Intercom",   kind: "Support", color: "#1F8DED", letter: "IC" },
    { name: "Drive",      kind: "Files", color: "#FFBA00", letter: "Dr" },
    { name: "Postgres",   kind: "DB", color: "#336791", letter: "Pg" },
    { name: "Snowflake",  kind: "Warehouse", color: "#29B5E8", letter: "SF" },
    { name: "Zapier",     kind: "Workflows", color: "#FF4A00", letter: "Z" },
    { name: "Calendar",   kind: "Calendar", color: "#4285F4", letter: "Cl" },
    { name: "Custom API", kind: "Internal", color: "#A78BFA", letter: "{}" },
  ];

  return (
    <section className="section" id="integrations">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">Integrations</span>
          <h2>Plug into the stack you<br/>already operate on.</h2>
          <p style={{ textAlign: "center" }}>
            Over 80 first-party connectors with OAuth, scoped permissions, sync windows and field-level mapping.
            Build internal ones in under 20 lines.
          </p>
        </div>

        <div className="int-grid">
          {tiles.map((t) => (
            <div className="int-tile" key={t.name}>
              <div className="int-tile-logo" style={{ color: t.color, background: `${t.color}15`, boxShadow: `inset 0 0 0 1px ${t.color}30` }}>{t.letter}</div>
              <div style={{ minWidth: 0 }}>
                <div className="int-tile-name">{t.name}</div>
                <div className="int-tile-kind">{t.kind}</div>
              </div>
              <span className="int-tile-status"><span className="dot dot-green" /></span>
            </div>
          ))}
          <div className="int-tile int-more">
            <div style={{ fontSize: 13, fontWeight: 500 }}>+ 65 more</div>
            <div className="int-tile-kind">View directory <I.arrow size={10} style={{ verticalAlign: -1 }} /></div>
          </div>
        </div>

        <div className="int-foot">
          <div className="int-foot-cell">
            <span className="label">Auth</span>
            <div className="int-foot-val">OAuth 2.0 · SCIM · Service accounts</div>
          </div>
          <div className="int-foot-cell">
            <span className="label">Sync</span>
            <div className="int-foot-val">Realtime, batched, on-demand</div>
          </div>
          <div className="int-foot-cell">
            <span className="label">Schema</span>
            <div className="int-foot-val">Mapped to your business graph</div>
          </div>
          <div className="int-foot-cell">
            <span className="label">SDK</span>
            <div className="int-foot-val">TypeScript & Python clients</div>
          </div>
        </div>
      </div>

      <style>{`
        .int-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .int-tile {
          display: flex; align-items: center; gap: 12px;
          padding: 14px;
          border-radius: 12px;
          background: linear-gradient(180deg, #0E1218, #0A0D12);
          box-shadow: inset 0 0 0 1px var(--line);
          transition: box-shadow .2s ease, transform .2s ease;
        }
        .int-tile:hover { transform: translateY(-1px); box-shadow: inset 0 0 0 1px var(--line-2); }
        .int-tile-logo {
          width: 36px; height: 36px; border-radius: 9px;
          display: grid; place-items: center;
          font-family: var(--font-mono); font-size: 12px; font-weight: 600;
          flex: none;
        }
        .int-tile-name { font-size: 13.5px; font-weight: 500; }
        .int-tile-kind { font-size: 11px; color: var(--text-mute); font-family: var(--font-mono); letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px; }
        .int-tile-status { margin-left: auto; }
        .int-more { color: var(--text-dim); }
        .int-foot {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 18px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(77,232,225,0.04), transparent);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .int-foot-cell .label { margin-bottom: 6px; display: block; }
        .int-foot-val { font-size: 13px; color: var(--text); }
        @media (max-width: 900px) {
          .int-grid { grid-template-columns: repeat(2, 1fr); }
          .int-foot { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </section>
  );
};

// ============================================================================
// 8. Dashboard preview — secondary deep view: execution log
// ============================================================================
const ExecutionLogSection = () => {
  const events = [
    { t: "14:02:38", agent: "Revenue", color: "#4DE8E1", level: "ok",   msg: "approve.send → Aiko Tanaka — proposed reply (id: msg_8421)" },
    { t: "14:02:32", agent: "Revenue", color: "#4DE8E1", level: "info", msg: "policy.eval ▸ allow-list OK, first-contact requires approval — escalated" },
    { t: "14:02:28", agent: "Revenue", color: "#4DE8E1", level: "info", msg: "tool.call hubspot.contact.get (cache hit, 41ms)" },
    { t: "14:01:57", agent: "Marketing", color: "#A78BFA", level: "ok",   msg: "draft.publish → Q3 SEO brief, 1,420w (run #4811)" },
    { t: "14:01:14", agent: "Client Flow", color: "#5B8DEF", level: "warn", msg: "memory.miss ▸ Northwind onboarding template not found — fallback used" },
    { t: "14:00:08", agent: "Operations", color: "#51D88A", level: "ok",   msg: "schedule.create ▸ Mon weekly digest 9:00 AM" },
    { t: "13:59:41", agent: "Revenue", color: "#4DE8E1", level: "info", msg: "agent.plan ▸ 4 steps · enrich → qualify → draft → approve" },
    { t: "13:59:02", agent: "Revenue", color: "#4DE8E1", level: "ok",   msg: "trigger.received ▸ inbound_form.submission (req_4F8a2)" },
  ];

  return (
    <section className="section" id="logs">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Observability</span>
          <h2>Every action is logged,<br/>replayable and attributable.</h2>
          <p className="lede">
            Inovense OS records every plan, tool call, write, decision and approval — at the millisecond.
            Replay any run with the same context, or roll back a write across systems.
          </p>
        </div>

        <div className="log-card">
          <div className="log-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <I.doc size={13} style={{ color: "var(--cyan)" }} />
              <strong style={{ fontSize: 13, fontWeight: 500 }}>Execution log · workspace/atlas-co</strong>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="pill">filter: all agents</span>
              <span className="pill">tail: live</span>
              <span className="dot dot-cyan pulsing" />
            </div>
          </div>
          <div className="log-rows">
            {events.map((e, i) => (
              <div className="log-row" key={i}>
                <span className="log-t">{e.t}</span>
                <span className={`log-level log-${e.level}`}>{e.level.toUpperCase()}</span>
                <span className="log-agent" style={{ color: e.color }}>[{e.agent}]</span>
                <span className="log-msg">{e.msg}</span>
              </div>
            ))}
          </div>
          <div className="log-foot">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>showing 8 of 12,841 events</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>Replay run · Export · Stream to webhook</span>
          </div>
        </div>
      </div>

      <style>{`
        .log-card {
          background: linear-gradient(180deg, #0A0D12, #07090C);
          border-radius: 14px;
          box-shadow:
            inset 0 0 0 1px var(--line),
            0 30px 60px -30px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .log-head, .log-foot { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--line); }
        .log-foot { border-bottom: 0; border-top: 1px solid var(--line); }
        .log-rows { padding: 6px 0; }
        .log-row {
          display: grid; grid-template-columns: 84px 60px 110px 1fr;
          gap: 12px; align-items: center;
          padding: 6px 18px;
          font-family: var(--font-mono); font-size: 12.5px;
          color: var(--text-dim);
          border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        .log-row:hover { background: rgba(255,255,255,0.015); }
        .log-t { color: var(--text-mute); }
        .log-level {
          font-size: 10.5px; letter-spacing: 0.06em;
          padding: 2px 6px; border-radius: 4px;
          text-align: center;
        }
        .log-ok    { background: var(--green-soft); color: var(--green); box-shadow: inset 0 0 0 1px rgba(81,216,138,0.3); }
        .log-info  { background: rgba(77,232,225,0.08); color: var(--cyan); box-shadow: inset 0 0 0 1px var(--cyan-line); }
        .log-warn  { background: var(--amber-soft); color: var(--amber); box-shadow: inset 0 0 0 1px rgba(245,194,107,0.3); }
        .log-msg { color: var(--text); }
        @media (max-width: 800px) {
          .log-row { grid-template-columns: 70px 60px 90px 1fr; font-size: 11.5px; }
        }
      `}</style>
    </section>
  );
};

// ============================================================================
// 9. Enterprise trust / security
// ============================================================================
const SecuritySection = () => {
  const features = [
    { icon: <I.shield size={16} />, title: "SOC 2 Type II", body: "Annual independent audit. Continuous monitoring across infrastructure and access." },
    { icon: <I.lock size={16} />, title: "Encrypted end-to-end", body: "TLS in transit. AES-256 at rest. Per-workspace KMS keys for sensitive data." },
    { icon: <I.users size={16} />, title: "SSO & SCIM", body: "Okta, Azure AD, Google. Role-based access, JIT provisioning, deprovision on offboard." },
    { icon: <I.key size={16} />, title: "Granular tool scopes", body: "Every agent acts under explicit, revocable permissions per system and per action." },
    { icon: <I.globe size={16} />, title: "Data residency", body: "US, EU and AU regions. Pin where data is stored, processed and indexed." },
    { icon: <I.doc size={16} />, title: "Immutable audit", body: "Append-only logs. Export to SIEM. Required reasons for sensitive overrides." },
  ];

  return (
    <section className="section" id="security">
      <div className="container">
        <div className="sec-head">
          <div>
            <span className="eyebrow">Enterprise</span>
            <h2 style={{ marginTop: 14 }}>Trust isn't a feature.<br/>It's the substrate.</h2>
          </div>
          <p style={{ maxWidth: 460 }}>
            Inovense OS is built for regulated industries from the floor up — with the controls, audits
            and isolation that procurement, security and legal have already asked you to ship.
          </p>
        </div>

        <div className="sec-grid">
          {features.map((f) => (
            <div className="sec-tile" key={f.title}>
              <div className="sec-ico">{f.icon}</div>
              <h4>{f.title}</h4>
              <p style={{ fontSize: 13.5, marginTop: 6 }}>{f.body}</p>
            </div>
          ))}
        </div>

        <div className="sec-badges">
          {["SOC 2 II", "ISO 27001", "GDPR", "HIPAA-ready", "PCI-DSS", "CCPA"].map((b) => (
            <span className="sec-badge" key={b}><I.check2 size={13} /> {b}</span>
          ))}
        </div>
      </div>

      <style>{`
        .sec-head { display: flex; justify-content: space-between; gap: 60px; margin-bottom: 56px; align-items: flex-end; }
        .sec-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .sec-tile {
          padding: 22px;
          border-radius: 14px;
          background: linear-gradient(180deg, #0E1218, #090C11);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .sec-ico {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: var(--cyan-soft);
          color: var(--cyan);
          display: grid; place-items: center;
          box-shadow: inset 0 0 0 1px var(--cyan-line);
          margin-bottom: 14px;
        }
        .sec-badges {
          display: flex; flex-wrap: wrap; gap: 10px;
          margin-top: 28px; padding-top: 28px;
          border-top: 1px solid var(--line);
        }
        .sec-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.02);
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px var(--line);
          font-size: 12.5px; color: var(--text-dim);
        }
        .sec-badge svg { color: var(--cyan); }
        @media (max-width: 900px) {
          .sec-head { flex-direction: column; gap: 20px; align-items: flex-start; }
          .sec-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
};

// ============================================================================
// 10. Self-serve onboarding
// ============================================================================
const OnboardingSection = () => {
  const steps = [
    { num: "01", min: "1 min", title: "Connect your stack", body: "OAuth into your CRM, inbox, calendar and docs. Choose scopes per system." },
    { num: "02", min: "3 min", title: "Pick your first operator", body: "Start with one role — Revenue, Marketing, Client Flow or Operations. Templates included." },
    { num: "03", min: "5 min", title: "Set boundaries", body: "Allow-lists, dollar limits, channels and approval gates — explicit by design." },
    { num: "04", min: "live",  title: "Go live & expand", body: "Run inside Inovense OS. Watch outputs. Add agents as workflows prove value." },
  ];
  return (
    <section className="section" id="onboarding">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Self-serve</span>
          <h2>From zero to first operator<br/>in under 10 minutes.</h2>
          <p className="lede">
            Inovense OS is self-serve from day one. Start free, deploy a single agent inside your boundaries,
            and expand into a full operating layer as it proves itself.
          </p>
        </div>

        <div className="on-track">
          {steps.map((s, i) => (
            <div className="on-step" key={s.num}>
              <div className="on-step-head">
                <span className="on-num">{s.num}</span>
                <span className="on-min">{s.min}</span>
              </div>
              <h4>{s.title}</h4>
              <p style={{ fontSize: 13.5 }}>{s.body}</p>
              {i < steps.length - 1 && <div className="on-connector"><I.arrow size={12} /></div>}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .on-track {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          position: relative;
        }
        .on-step {
          position: relative;
          padding: 24px;
          border-radius: 14px;
          background: linear-gradient(180deg, #0E1218, #090C11);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .on-step-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .on-num { font-family: var(--font-mono); font-size: 11.5px; color: var(--cyan); letter-spacing: 0.06em; }
        .on-min { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-mute); padding: 3px 7px; border-radius: 4px; background: rgba(255,255,255,0.03); box-shadow: inset 0 0 0 1px var(--line); letter-spacing: 0.05em; text-transform: uppercase; }
        .on-step h4 { margin-bottom: 8px; }
        .on-connector {
          position: absolute;
          top: 50%; right: -16px;
          transform: translateY(-50%);
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--bg);
          display: grid; place-items: center;
          color: var(--cyan);
          box-shadow: inset 0 0 0 1px var(--cyan-line);
          z-index: 2;
        }
        @media (max-width: 1000px) {
          .on-track { grid-template-columns: 1fr 1fr; }
          .on-connector { display: none; }
        }
        @media (max-width: 600px) {
          .on-track { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
};

// ============================================================================
// 11. Pricing
// ============================================================================
const PricingSection = () => {
  const tiers = [
    {
      name: "Starter",
      tagline: "For a single operator inside one team.",
      price: "$0",
      unit: "/ workspace",
      hint: "Free during preview",
      bullets: ["1 agent", "5 connectors", "1,000 actions / mo", "Slack + email approvals", "Community support"],
      cta: "Start free",
      style: "ghost",
    },
    {
      name: "Growth",
      tagline: "When AI starts running real workflows.",
      price: "$1,200",
      unit: "/ workspace · month",
      hint: "Billed annually",
      bullets: ["Up to 8 agents", "All connectors", "50k actions / mo", "Approval policies & roles", "Audit logs · 90 days", "Email + Slack support"],
      cta: "Start trial",
      style: "primary",
      featured: true,
    },
    {
      name: "Enterprise",
      tagline: "For regulated, multi-team operations.",
      price: "Custom",
      unit: "",
      hint: "Annual contract",
      bullets: ["Unlimited agents", "Custom connectors & private models", "SSO/SCIM · SOC 2 · HIPAA", "Data residency · KMS", "Dedicated success + SLA", "Procurement & legal review"],
      cta: "Contact sales",
      style: "ghost",
    },
  ];

  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">Pricing</span>
          <h2>Pay for outcomes,<br/>not seats.</h2>
          <p style={{ textAlign: "center" }}>Every plan includes the full operating layer — agents, workflows, memory, approvals, audit and connectors. Scale changes the volume, not the surface.</p>
        </div>

        <div className="pr-grid">
          {tiers.map((t) => (
            <div className={`pr-card ${t.featured ? "pr-featured" : ""}`} key={t.name}>
              {t.featured && <span className="pr-tag">Most chosen</span>}
              <div className="pr-name">{t.name}</div>
              <div className="pr-tagline">{t.tagline}</div>
              <div className="pr-price-row">
                <span className="pr-price">{t.price}</span>
                <span className="pr-unit">{t.unit}</span>
              </div>
              <div className="pr-hint">{t.hint}</div>
              <a href="#start" className={`btn ${t.style === "primary" ? "btn-primary" : "btn-ghost"} pr-cta`}>
                {t.cta} <I.arrow size={13} />
              </a>
              <div className="pr-divider" />
              <ul className="pr-bullets">
                {t.bullets.map((b) => <li key={b}><I.check size={11} /> {b}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="pr-foot">
          <span className="mono" style={{ fontSize: 12, color: "var(--text-mute)" }}>
            Need volume actions, custom agents, or a private deployment? <a href="#sales" style={{ color: "var(--cyan)" }}>Talk to us</a>.
          </span>
        </div>
      </div>

      <style>{`
        .pr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pr-card {
          position: relative;
          padding: 28px 24px 24px;
          border-radius: 16px;
          background: linear-gradient(180deg, #0D1015, #08090D);
          box-shadow: inset 0 0 0 1px var(--line);
          display: flex; flex-direction: column;
        }
        .pr-featured {
          background: linear-gradient(180deg, #0E141A, #07090C);
          box-shadow:
            inset 0 0 0 1px var(--cyan-line),
            0 0 0 1px rgba(77,232,225,0.04),
            0 30px 80px -30px rgba(77,232,225,0.18);
        }
        .pr-tag {
          position: absolute; top: -10px; left: 24px;
          padding: 4px 10px;
          background: var(--cyan);
          color: #04130F;
          border-radius: 999px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          font-weight: 600;
        }
        .pr-name { font-size: 18px; font-weight: 500; letter-spacing: -0.015em; }
        .pr-tagline { font-size: 13.5px; color: var(--text-mute); margin-top: 6px; }
        .pr-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 24px; }
        .pr-price { font-size: 44px; font-weight: 500; letter-spacing: -0.03em; }
        .pr-unit { font-size: 12.5px; color: var(--text-mute); font-family: var(--font-mono); }
        .pr-hint { font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); margin-top: 4px; }
        .pr-cta { margin-top: 20px; justify-content: center; width: 100%; }
        .pr-divider { height: 1px; background: var(--line); margin: 22px 0 18px; }
        .pr-bullets { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .pr-bullets li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--text-dim); }
        .pr-bullets li svg { color: var(--cyan); flex: none; }
        .pr-foot { margin-top: 24px; text-align: center; }
        @media (max-width: 900px) { .pr-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

// ============================================================================
// 12. Final CTA
// ============================================================================
const FinalCTA = () => {
  return (
    <section className="section section-sm" id="start">
      <div className="container">
        <div className="cta-card">
          <div className="cta-grid-bg" />
          <div className="cta-glow" />
          <div className="cta-inner">
            <div className="cta-mark">
              <InovenseMark size={36} />
            </div>
            <h2 style={{ maxWidth: 720, textAlign: "center" }}>
              The next decade of business<br/>will be run inside an OS.
            </h2>
            <p style={{ textAlign: "center", maxWidth: 560 }}>
              Inovense is building the operating layer it deserves. Start with one agent today —
              expand into a full operating team when the value is undeniable.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              <a href="#signup" className="btn btn-primary btn-lg">Start free <I.arrow size={14} /></a>
              <a href="#demo" className="btn btn-ghost btn-lg">Book a 20-min demo</a>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 18, color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontSize: 11.5, justifyContent: "center", flexWrap: "wrap" }}>
              <span>No credit card</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>SOC 2 Type II</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cta-card {
          position: relative;
          padding: 96px 32px 88px;
          border-radius: 24px;
          background: linear-gradient(180deg, #0A0D12, #06080B);
          box-shadow:
            inset 0 0 0 1px var(--line),
            0 60px 120px -40px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .cta-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 80%);
        }
        .cta-glow {
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 900px; height: 600px;
          background: radial-gradient(ellipse at center, rgba(77,232,225,0.18), transparent 60%);
          filter: blur(40px);
          pointer-events: none;
        }
        .cta-inner {
          position: relative;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .cta-mark {
          margin-bottom: 10px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(77,232,225,0.06);
          box-shadow: inset 0 0 0 1px var(--cyan-line);
        }
      `}</style>
    </section>
  );
};

Object.assign(window, { IntegrationsSection, ExecutionLogSection, SecuritySection, OnboardingSection, PricingSection, FinalCTA });
