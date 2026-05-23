// Inovense — Product sections: operating layer, agents, workflows, memory, approvals
// All sections share the section CSS in styles.css and add small per-section pieces.

// ============================================================================
// 2. The operating layer — diagram
// ============================================================================
const OperatingLayerSection = () => {
  return (
    <section className="section" id="platform">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">The operating layer</span>
          <h2>The missing layer between your<br/>business systems and AI.</h2>
          <p className="lede">
            Inovense OS sits in the middle: it gives AI agents structured access to your tools,
            memory of your business, the right to act inside policy — and a queue when humans
            need to weigh in. Models don't run in chat windows. They run as operators.
          </p>
        </div>

        <OperatingLayerDiagram />

        <div className="ol-row">
          {[
            { num: "01", title: "Agents that operate", body: "Specialized AI workers — Revenue, Marketing, Client Flow, Operations — each scoped to real outcomes, not chat." },
            { num: "02", title: "Connected to systems", body: "Bi-directional connectors to CRM, inbox, calendar, billing, docs and data warehouses. Reads, writes, observes." },
            { num: "03", title: "Inside your boundaries", body: "Policies, approval gates, allow-lists and audit logs. Agents act only where you've explicitly said yes." },
          ].map((c) => (
            <div key={c.num} className="ol-cell">
              <span className="label">{c.num}</span>
              <h4>{c.title}</h4>
              <p style={{ fontSize: 14.5 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .ol-diagram {
          position: relative;
          border-radius: 18px;
          padding: 28px 24px 24px;
          background: linear-gradient(180deg, #0B0E13, #07090C);
          box-shadow: inset 0 0 0 1px var(--line);
          overflow: hidden;
        }
        .ol-diagram::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 80%);
          pointer-events: none;
        }
        .ol-stack {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 60px 1fr 60px 1fr;
          gap: 0;
          align-items: stretch;
        }
        .ol-col {
          display: flex; flex-direction: column; gap: 8px;
          padding: 8px;
        }
        .ol-col-title {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px 6px 8px;
          margin-bottom: 4px;
        }
        .ol-col-title .label { color: var(--text-mute); }
        .ol-tile {
          display: flex; align-items: center; gap: 10px;
          padding: 12px;
          border-radius: 10px;
          background: linear-gradient(180deg, #11151B, #0B0E13);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .ol-tile .ico {
          width: 28px; height: 28px;
          display: grid; place-items: center;
          border-radius: 7px;
          background: rgba(255,255,255,0.04);
          color: var(--text-dim);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .ol-tile.cyan .ico { background: var(--cyan-soft); color: var(--cyan); box-shadow: inset 0 0 0 1px var(--cyan-line); }
        .ol-tile .meta { font-size: 12.5px; font-weight: 500; color: var(--text); }
        .ol-tile .sub { font-size: 11px; color: var(--text-mute); font-family: var(--font-mono); }
        .ol-center {
          position: relative;
          padding: 8px;
        }
        .ol-center-shell {
          position: relative;
          height: 100%;
          min-height: 280px;
          border-radius: 14px;
          padding: 18px;
          background:
            radial-gradient(ellipse at center, rgba(77,232,225,0.10), transparent 70%),
            linear-gradient(180deg, #0E1218, #090C11);
          box-shadow:
            inset 0 0 0 1px rgba(77,232,225,0.22),
            0 0 0 1px rgba(77,232,225,0.04),
            0 20px 60px -20px rgba(77,232,225,0.18);
          display: flex; flex-direction: column; gap: 8px;
        }
        .ol-center-shell::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 14px;
          padding: 1px;
          background: linear-gradient(180deg, rgba(77,232,225,0.5), transparent 50%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .ol-os-mark {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--cyan); padding-bottom: 6px; border-bottom: 1px solid var(--line);
        }
        .ol-os-stack { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .ol-os-pillar {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px;
          background: rgba(255,255,255,0.025);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .ol-os-pillar .num {
          font-family: var(--font-mono); font-size: 10px; color: var(--cyan); width: 18px;
        }
        .ol-os-pillar .dot { margin-left: auto; }

        .ol-conn {
          position: relative;
        }
        .ol-conn-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

        .ol-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 28px;
        }
        .ol-cell {
          padding: 22px;
          border-radius: 14px;
          background: linear-gradient(180deg, #0D1015, #08090D);
          box-shadow: inset 0 0 0 1px var(--line);
        }
        .ol-cell h4 { margin: 10px 0 8px; }

        @media (max-width: 900px) {
          .ol-stack { grid-template-columns: 1fr; gap: 12px; }
          .ol-conn { display: none; }
          .ol-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
};

const OperatingLayerDiagram = () => {
  return (
    <div className="ol-diagram">
      <div className="ol-stack">
        {/* Left col: business systems */}
        <div className="ol-col">
          <div className="ol-col-title"><span className="label">Your business</span></div>
          {[
            ["CRM", "Salesforce / HubSpot", <I.briefcase size={14} />],
            ["Inbox & calendar", "Gmail · Outlook", <I.inbox size={14} />],
            ["Docs", "Notion · Drive · Confluence", <I.doc size={14} />],
            ["Data", "Warehouse · Postgres · Stripe", <I.database size={14} />],
            ["Comms", "Slack · Teams · Intercom", <I.message size={14} />],
          ].map(([name, sub, ico]) => (
            <div className="ol-tile" key={name}>
              <span className="ico">{ico}</span>
              <div style={{ minWidth: 0 }}>
                <div className="meta">{name}</div>
                <div className="sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Connector */}
        <div className="ol-conn">
          <svg className="ol-conn-svg" viewBox="0 0 60 480" preserveAspectRatio="none">
            <defs>
              <linearGradient id="conn-a" x1="0" x2="1">
                <stop offset="0" stopColor="#4DE8E1" stopOpacity="0.05" />
                <stop offset="0.5" stopColor="#4DE8E1" stopOpacity="0.5" />
                <stop offset="1" stopColor="#4DE8E1" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {[40, 110, 180, 250, 320].map((y, i) => (
              <line key={i} x1="0" x2="60" y1={y} y2={y} stroke="url(#conn-a)" strokeWidth="1.2" strokeDasharray="3 4" style={{ animation: `flowDash ${1.5 + i*0.1}s linear infinite` }} />
            ))}
          </svg>
        </div>

        {/* Center: Inovense OS */}
        <div className="ol-center">
          <div className="ol-center-shell">
            <div className="ol-os-mark">
              <InovenseMark size={16} />
              <span style={{ color: "#ECEFF3", fontFamily: "var(--font-sans)", fontWeight: 600, letterSpacing: "0.12em", fontSize: 11 }}>INOVENSE&nbsp;OS</span>
            </div>
            <div className="ol-os-stack">
              {[
                ["01", "Connectors", "Auth + sync layer"],
                ["02", "Agent runtime", "Plans · acts · escalates"],
                ["03", "Memory & context", "Indexed business graph"],
                ["04", "Policy & boundaries", "Allow-lists, approvals"],
                ["05", "Execution & audit", "Logs, retries, replay"],
              ].map(([num, name, sub]) => (
                <div className="ol-os-pillar" key={num}>
                  <span className="num">{num}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{sub}</div>
                  </div>
                  <span className="dot dot-cyan pulsing" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="ol-conn">
          <svg className="ol-conn-svg" viewBox="0 0 60 480" preserveAspectRatio="none">
            {[40, 130, 230, 330].map((y, i) => (
              <line key={i} x1="0" x2="60" y1={y} y2={y} stroke="url(#conn-a)" strokeWidth="1.2" strokeDasharray="3 4" style={{ animation: `flowDash ${1.6 + i*0.12}s linear infinite reverse` }} />
            ))}
          </svg>
        </div>

        {/* Right col: AI / models */}
        <div className="ol-col">
          <div className="ol-col-title"><span className="label">AI models & tools</span></div>
          {[
            ["Frontier models", "GPT · Claude · Gemini", <I.spark size={14} />, true],
            ["Embeddings", "Voyage · OpenAI · Cohere", <I.layers size={14} />, false],
            ["Browser & search", "Web · Crawl · Retrieve", <I.globe size={14} />, false],
            ["Code execution", "Sandboxed runtime", <I.cube size={14} />, false],
            ["Custom tools", "Internal APIs · webhooks", <I.cpu size={14} />, false],
          ].map(([name, sub, ico, cyan]) => (
            <div className={`ol-tile ${cyan ? "cyan" : ""}`} key={name}>
              <span className="ico">{ico}</span>
              <div style={{ minWidth: 0 }}>
                <div className="meta">{name}</div>
                <div className="sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. AI Agents — feature grid
// ============================================================================
const AgentsSection = () => {
  const agents = [
    {
      mark: "RV", color: "#4DE8E1", name: "Revenue Operator",
      tag: "Sales · Pipeline",
      bullets: [
        "Triage inbound, enrich, route by ICP",
        "Draft follow-ups in your brand voice",
        "Surface opportunities & proposal angles",
        "Sync notes back to CRM automatically",
      ],
      stat: { num: "326", unit: "actions / week", delta: "+38%" },
      hint: "Currently drafting 14 follow-ups",
    },
    {
      mark: "MK", color: "#A78BFA", name: "Marketing Operator",
      tag: "Content · SEO · Campaigns",
      bullets: [
        "Generate briefs, drafts and ad angles",
        "Run SEO research against live data",
        "Pause campaigns under reply thresholds",
        "Hand finished work back for approval",
      ],
      stat: { num: "118", unit: "outputs / week", delta: "+24%" },
      hint: "Drafting Q3 campaign brief",
    },
    {
      mark: "CF", color: "#5B8DEF", name: "Client Flow Operator",
      tag: "Intake · Onboarding",
      bullets: [
        "Run intake forms and clarifying threads",
        "Prepare onboarding kits & SOWs",
        "Schedule reminders without nagging",
        "Keep clients informed at every step",
      ],
      stat: { num: "42", unit: "intakes / week", delta: "+12%" },
      hint: "Awaiting approval — Northwind kit",
    },
    {
      mark: "OP", color: "#51D88A", name: "Operations Operator",
      tag: "Reports · Internal",
      bullets: [
        "Compile weekly summaries across tools",
        "Maintain runbooks & SOP clarity",
        "Auto-file recurring internal tasks",
        "Flag drift in metrics & process",
      ],
      stat: { num: "9.2h", unit: "saved / week", delta: "+1.4h" },
      hint: "Building weekly digest",
    },
  ];

  return (
    <section className="section" id="agents">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Agents</span>
          <h2>Operators, not chat threads.</h2>
          <p className="lede">
            Inovense agents are scoped to a role and trained on the way your business runs.
            They plan multi-step work, take action where you've allowed it, and hand the rest to a human.
          </p>
        </div>

        <div className="ag-grid">
          {agents.map((a) => <AgentCard key={a.mark} agent={a} />)}
        </div>
      </div>

      <style>{`
        .ag-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .ag-card {
          position: relative;
          padding: 22px 22px 18px;
          border-radius: 16px;
          background: linear-gradient(180deg, #0E1218, #090C11);
          box-shadow: inset 0 0 0 1px var(--line);
          display: flex; flex-direction: column; gap: 16px;
          overflow: hidden;
          transition: box-shadow .25s ease, transform .25s ease;
        }
        .ag-card::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent, var(--cyan)), transparent);
          opacity: 0.4;
        }
        .ag-card:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px var(--line-2), 0 24px 60px -30px rgba(0,0,0,0.6); }
        .ag-card-head { display: flex; align-items: center; gap: 14px; }
        .ag-card-avatar {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: grid; place-items: center;
          font-family: var(--font-mono); font-size: 14px; font-weight: 600;
        }
        .ag-card-name { font-size: 17px; font-weight: 500; letter-spacing: -0.015em; }
        .ag-card-tag { font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); letter-spacing: 0.06em; text-transform: uppercase; }
        .ag-card-status {
          margin-left: auto;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 8px;
          background: rgba(255,255,255,0.04);
          border-radius: 999px;
          font-family: var(--font-mono); font-size: 10.5px;
          color: var(--text-dim);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          box-shadow: inset 0 0 0 1px var(--line);
        }

        .ag-card-bullets { display: flex; flex-direction: column; gap: 6px; }
        .ag-card-bullets li {
          list-style: none;
          display: flex; gap: 10px; align-items: flex-start;
          font-size: 13.5px; color: var(--text-dim);
        }
        .ag-card-bullets li::before {
          content: ""; flex: none;
          width: 14px; height: 14px;
          border-radius: 4px;
          background: rgba(255,255,255,0.04);
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234DE8E1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12 10 17 19 8'/></svg>");
          background-position: center;
          background-size: 12px;
          background-repeat: no-repeat;
          margin-top: 3px;
        }
        .ag-card-foot {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding-top: 14px;
          margin-top: auto;
          border-top: 1px solid var(--line);
        }
        .ag-card-metric { display: flex; align-items: baseline; gap: 6px; }
        .ag-card-metric .num { font-size: 22px; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .ag-card-metric .unit { font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); }
        .ag-card-metric .delta { font-family: var(--font-mono); font-size: 10.5px; padding: 2px 6px; background: var(--green-soft); color: var(--green); border-radius: 4px; }
        .ag-card-hint {
          font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono);
          display: inline-flex; align-items: center; gap: 6px;
        }
        @media (max-width: 800px) { .ag-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

const AgentCard = ({ agent: a }) => (
  <div className="ag-card" style={{ "--accent": a.color }}>
    <div className="ag-card-head">
      <div className="ag-card-avatar"
        style={{ color: a.color, background: `linear-gradient(135deg, ${a.color}22, ${a.color}06)`, boxShadow: `inset 0 0 0 1px ${a.color}55` }}>
        {a.mark}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="ag-card-name">{a.name}</div>
        <div className="ag-card-tag">{a.tag}</div>
      </div>
      <div className="ag-card-status">
        <span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} />
        Running
      </div>
    </div>

    <ul className="ag-card-bullets">
      {a.bullets.map((b) => <li key={b}>{b}</li>)}
    </ul>

    <div className="ag-card-foot">
      <div className="ag-card-metric">
        <span className="num">{a.stat.num}</span>
        <span className="unit">{a.stat.unit}</span>
        <span className="delta">{a.stat.delta}</span>
      </div>
      <span className="ag-card-hint">
        <span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} />
        {a.hint}
      </span>
    </div>
  </div>
);

// ============================================================================
// 4. Workflow orchestration
// ============================================================================
const WorkflowsSection = () => {
  return (
    <section className="section" id="workflows">
      <div className="container">
        <div className="wf-split">
          <div className="wf-copy">
            <span className="eyebrow">Workflows</span>
            <h2>Compose work the way<br/>your business actually runs.</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              Drag steps together — triggers, agent actions, tool calls, approvals — and Inovense OS
              runs them like a production system. Every run is observable, retriable and idempotent.
            </p>
            <div className="wf-bullets">
              {[
                ["Triggers", "Forms, emails, CRM events, schedules, webhooks."],
                ["Agent steps", "Multi-step planning, tool use, structured output."],
                ["Approvals", "Insert a human at any step, in any channel."],
                ["Branching", "Conditional logic, retries, fan-out, fan-in."],
              ].map(([h, b]) => (
                <div key={h} className="wf-bullet">
                  <div className="wf-bullet-head"><span className="dot dot-cyan" /><strong>{h}</strong></div>
                  <p style={{ fontSize: 13.5 }}>{b}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="wf-builder">
            <WorkflowBuilderMock />
          </div>
        </div>
      </div>

      <style>{`
        .wf-split { display: grid; grid-template-columns: 1fr 1.05fr; gap: 56px; align-items: center; }
        .wf-bullets { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 28px; }
        .wf-bullet-head { display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .wf-bullet strong { color: var(--text); font-weight: 500; }
        .wf-bullet p { color: var(--text-mute); margin-top: 6px; }
        @media (max-width: 1000px) { .wf-split { grid-template-columns: 1fr; gap: 40px; } }
      `}</style>
    </section>
  );
};

const WorkflowBuilderMock = () => {
  // Stylized canvas with nodes & connections
  const steps = [
    { id: "trigger", icon: <I.bolt size={12} />, label: "Trigger", sub: "New form submission", x: 0, y: 30, color: "#A4ABB4" },
    { id: "enrich",  icon: <I.spark size={12} />, label: "Enrich record", sub: "Clearbit + memory", x: 0, y: 105, color: "#A78BFA" },
    { id: "qualify", icon: <I.target size={12} />, label: "Qualify lead", sub: "Revenue agent", x: 0, y: 180, color: "#4DE8E1" },
    { id: "branch",  icon: <I.branch size={12} />, label: "If ICP score ≥ 70", sub: "Branch", x: 0, y: 255, color: "#F5C26B" },
    { id: "draft",   icon: <I.doc size={12} />, label: "Draft personalized reply", sub: "GPT · brand voice", x: 0, y: 330, color: "#4DE8E1" },
    { id: "approve", icon: <I.check2 size={12} />, label: "Human approval", sub: "Slack #revops", x: 0, y: 405, color: "#F5C26B" },
    { id: "send",    icon: <I.arrowUR size={12} />, label: "Send & log", sub: "Gmail → HubSpot", x: 0, y: 480, color: "#51D88A" },
  ];

  return (
    <div className="wf-builder-card">
      <div className="wf-builder-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.flow size={14} style={{ color: "var(--cyan)" }} />
          <strong style={{ fontSize: 13, fontWeight: 500 }}>Inbound · Revenue</strong>
          <span className="pill pill-cyan">v8 · live</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-mute)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <span>auto-saved 2s ago</span>
          <span className="kbd">Run</span>
        </div>
      </div>
      <div className="wf-canvas">
        <svg viewBox="0 0 320 540" className="wf-canvas-svg" preserveAspectRatio="xMidYMin slice">
          {/* connecting line */}
          <line x1="56" y1="40" x2="56" y2="510" stroke="rgba(77,232,225,0.18)" strokeWidth="1" strokeDasharray="3 4" />
        </svg>
        {steps.map((s, i) => (
          <div className="wf-node" key={s.id} style={{ top: s.y, "--accent": s.color, animationDelay: `${i*0.08}s` }}>
            <span className="wf-node-ico" style={{ color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}55`, background: `${s.color}10` }}>{s.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div className="wf-node-label">{s.label}</div>
              <div className="wf-node-sub">{s.sub}</div>
            </div>
            {i === 4 && <span className="pill pill-cyan" style={{ marginLeft: "auto" }}>Editing</span>}
          </div>
        ))}
        <div className="wf-add">+ Add step</div>
      </div>

      <style>{`
        .wf-builder-card {
          background: linear-gradient(180deg, #0C0F14, #07090C);
          border-radius: 16px;
          box-shadow:
            inset 0 0 0 1px var(--line),
            0 30px 60px -30px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .wf-builder-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
        }
        .wf-canvas {
          position: relative;
          padding: 20px 24px;
          background:
            radial-gradient(600px 300px at 50% 0%, rgba(77,232,225,0.05), transparent 70%),
            #08090C;
          background-image:
            radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 16px 16px;
          background-position: 0 0;
          min-height: 540px;
        }
        .wf-canvas-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
        .wf-node {
          position: absolute; left: 24px; right: 24px;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: linear-gradient(180deg, #11151B, #0B0E13);
          border-radius: 10px;
          box-shadow: inset 0 0 0 1px var(--line);
          animation: fadeUp .5s ease both;
        }
        .wf-node-ico { width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; }
        .wf-node-label { font-size: 13px; font-weight: 500; }
        .wf-node-sub { font-size: 11px; color: var(--text-mute); font-family: var(--font-mono); }
        .wf-add {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          font-family: var(--font-mono); font-size: 11px;
          padding: 6px 12px;
          color: var(--text-mute);
          border-radius: 999px;
          background: rgba(255,255,255,0.02);
          box-shadow: inset 0 0 0 1px var(--line);
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// 5. Company memory / context
// ============================================================================
const MemorySection = () => {
  return (
    <section className="section" id="memory">
      <div className="container">
        <div className="mem-split">
          <MemoryVisual />
          <div>
            <span className="eyebrow">Memory & context</span>
            <h2 style={{ marginTop: 14 }}>Your business, as<br/>an indexed graph.</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              Inovense OS continuously builds a structured understanding of your company — accounts,
              opportunities, projects, people, documents — and makes it queryable by every agent.
              Nothing happens in a context-less chat.
            </p>
            <div className="mem-list">
              {[
                ["Source-of-truth aware", "Connects directly to your CRM, docs and warehouse. Memory updates as your business updates."],
                ["Scoped retrieval", "Each agent only sees the slices of memory it's authorized to read."],
                ["Custom entities", "Define accounts, projects, deals, contracts — the way your team already names them."],
                ["Versioned & audit-friendly", "Every memory write is logged. Roll back, replay, attribute."],
              ].map(([h, b]) => (
                <div className="mem-li" key={h}>
                  <span className="mem-tick"><I.check size={11} /></span>
                  <div>
                    <div className="mem-li-h">{h}</div>
                    <div className="mem-li-b">{b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mem-split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; }
        .mem-list { display: flex; flex-direction: column; gap: 16px; margin-top: 28px; }
        .mem-li { display: flex; gap: 12px; align-items: flex-start; }
        .mem-tick { flex: none; width: 22px; height: 22px; border-radius: 6px; background: var(--cyan-soft); color: var(--cyan); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--cyan-line); margin-top: 1px;}
        .mem-li-h { font-size: 14.5px; font-weight: 500; color: var(--text); }
        .mem-li-b { font-size: 13.5px; color: var(--text-mute); margin-top: 4px; }
        @media (max-width: 1000px) { .mem-split { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

const MemoryVisual = () => {
  // A premium "graph view" — central pill with surrounding entity cards
  return (
    <div className="mem-vis">
      <div className="mem-vis-bg">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}>
          <defs>
            <radialGradient id="memglow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#4DE8E1" stopOpacity="0.4" />
              <stop offset="1" stopColor="#4DE8E1" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#memglow)" />
        </svg>
      </div>

      {/* Central node */}
      <div className="mem-center">
        <I.database size={16} style={{ color: "var(--cyan)" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Atlas & Co. — business graph</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>14,392 entities · synced 1m ago</div>
        </div>
      </div>

      {/* Connector lines via SVG */}
      <svg className="mem-lines" viewBox="0 0 480 360" preserveAspectRatio="none">
        <g stroke="rgba(77,232,225,0.30)" strokeWidth="1" fill="none">
          <path d="M240 180 L 80 60" />
          <path d="M240 180 L 400 60" />
          <path d="M240 180 L 60 200" />
          <path d="M240 180 L 420 200" />
          <path d="M240 180 L 130 320" />
          <path d="M240 180 L 360 320" />
        </g>
      </svg>

      {[
        { top: "8%",  left: "6%",  icon: <I.briefcase size={11} />, label: "Account", val: "Northwind Co." },
        { top: "8%",  right: "6%", icon: <I.user size={11} />,      label: "Contact", val: "Aiko Tanaka" },
        { top: "45%", left: "0%",  icon: <I.doc size={11} />,       label: "Document", val: "MSA-v4.pdf" },
        { top: "45%", right: "0%", icon: <I.trend size={11} />,     label: "Opportunity", val: "$184k · Series B" },
        { bottom: "5%", left: "12%", icon: <I.flow size={11} />,    label: "Workflow", val: "Q3 onboarding" },
        { bottom: "5%", right: "12%", icon: <I.message size={11} />, label: "Thread", val: "#atlas-pilot" },
      ].map((n, i) => (
        <div className="mem-node" key={i} style={n}>
          <span className="mem-node-ico">{n.icon}</span>
          <div>
            <div className="mem-node-label">{n.label}</div>
            <div className="mem-node-val">{n.val}</div>
          </div>
        </div>
      ))}

      <style>{`
        .mem-vis {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 16px;
          background: linear-gradient(180deg, #0B0E13, #07090C);
          box-shadow: inset 0 0 0 1px var(--line);
          overflow: hidden;
        }
        .mem-vis-bg { position: absolute; inset: 0; }
        .mem-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
        .mem-center {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: linear-gradient(180deg, #11151B, #0A0D12);
          border-radius: 12px;
          box-shadow:
            inset 0 0 0 1px rgba(77,232,225,0.30),
            0 16px 40px -16px rgba(77,232,225,0.30);
          z-index: 2;
        }
        .mem-node {
          position: absolute;
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          background: linear-gradient(180deg, #0F1218, #0A0D12);
          border-radius: 9px;
          box-shadow: inset 0 0 0 1px var(--line);
          z-index: 1;
          min-width: 120px;
        }
        .mem-node-ico { width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center; background: rgba(255,255,255,0.04); color: var(--text-dim); box-shadow: inset 0 0 0 1px var(--line); }
        .mem-node-label { font-size: 10.5px; color: var(--text-mute); font-family: var(--font-mono); letter-spacing: 0.05em; text-transform: uppercase; }
        .mem-node-val { font-size: 12px; font-weight: 500; color: var(--text); margin-top: 1px; }
      `}</style>
    </div>
  );
};

// ============================================================================
// 6. Approvals & boundaries
// ============================================================================
const ApprovalsSection = () => {
  return (
    <section className="section" id="approvals">
      <div className="container">
        <div className="ap-split">
          <div>
            <span className="eyebrow">Boundaries & approvals</span>
            <h2 style={{ marginTop: 14 }}>Give AI the keys you<br/>actually want to give.</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              Inovense OS makes "what AI can do" explicit. Define allow-lists, dollar limits,
              approval gates and tool scopes — then watch agents stay inside them. Anything risky lands in your inbox.
            </p>
            <div className="ap-stats">
              {[
                ["Allow-listed actions", "162"],
                ["Approval rate", "94%"],
                ["Avg. review time", "4m 12s"],
                ["Audit events / day", "8.4k"],
              ].map(([k, v]) => (
                <div className="ap-stat" key={k}>
                  <div className="ap-stat-val">{v}</div>
                  <div className="ap-stat-lab">{k}</div>
                </div>
              ))}
            </div>
          </div>

          <ApprovalsVisual />
        </div>
      </div>

      <style>{`
        .ap-split { display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: center; }
        .ap-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 32px; max-width: 480px; }
        .ap-stat { padding: 16px; background: linear-gradient(180deg, #0D1015, #08090D); border-radius: 12px; box-shadow: inset 0 0 0 1px var(--line); }
        .ap-stat-val { font-size: 26px; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .ap-stat-lab { font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); letter-spacing: 0.05em; text-transform: uppercase; margin-top: 4px; }
        @media (max-width: 1000px) { .ap-split { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

const ApprovalsVisual = () => {
  return (
    <div className="ap-card">
      <div className="ap-card-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <I.inbox size={13} style={{ color: "var(--cyan)" }} />
          <strong style={{ fontSize: 13, fontWeight: 500 }}>Approval · #4,812</strong>
          <span className="pill pill-amber">Awaiting review</span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>Revenue Operator → jordan@atlas.co</span>
      </div>

      <div className="ap-card-body">
        <div className="ap-section">
          <div className="ap-section-label">Proposed action</div>
          <div className="ap-action">
            <span className="dot dot-cyan" />
            <span>Send personalized reply to <strong style={{ color: "var(--text)" }}>Aiko Tanaka · Northwind Co.</strong></span>
          </div>
        </div>

        <div className="ap-section">
          <div className="ap-section-label">Draft</div>
          <div className="ap-draft">
            <p>Hi Aiko —</p>
            <p>Thanks for the intro. Based on our previous work with <span className="ap-hl">Acme Industries</span> (similar Series B operating shape), I'd recommend kicking off with a 30-min discovery and a tailored ops audit.</p>
            <p>Could <strong className="ap-hl">Tuesday 2pm PT</strong> work? Happy to share two case studies ahead of time.</p>
          </div>
        </div>

        <div className="ap-section">
          <div className="ap-section-label">Policy checks</div>
          <ul className="ap-checks">
            <li><span className="dot dot-cyan" /> Recipient inside allow-list <span className="ap-tail">domain: northwind.com</span></li>
            <li><span className="dot dot-cyan" /> No PII outside whitelisted fields</li>
            <li><span className="dot dot-cyan" /> Spend per send under $0.40 limit</li>
            <li><span className="dot dot-amber" /> First contact in 14 days <span className="ap-tail">requires approval</span></li>
          </ul>
        </div>

        <div className="ap-actions">
          <button className="appr-btn approve">Approve & send</button>
          <button className="appr-btn edit">Edit draft</button>
          <button className="appr-btn deny">Skip</button>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>⌘+↵ to approve</span>
        </div>
      </div>

      <style>{`
        .ap-card {
          background: linear-gradient(180deg, #0C0F14, #07090C);
          border-radius: 16px;
          box-shadow:
            inset 0 0 0 1px var(--line),
            0 30px 60px -30px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .ap-card-head {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 16px; border-bottom: 1px solid var(--line);
        }
        .ap-card-body { padding: 18px; display: flex; flex-direction: column; gap: 18px; }
        .ap-section-label { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.10em; text-transform: uppercase; margin-bottom: 8px; }
        .ap-action {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: rgba(77,232,225,0.05);
          border-radius: 9px;
          box-shadow: inset 0 0 0 1px var(--cyan-line);
          font-size: 13px; color: var(--text-dim);
        }
        .ap-draft {
          padding: 12px 14px;
          border-radius: 9px;
          background: rgba(255,255,255,0.02);
          box-shadow: inset 0 0 0 1px var(--line);
          font-size: 13px; color: var(--text-dim);
          display: flex; flex-direction: column; gap: 8px;
        }
        .ap-draft p { margin: 0; }
        .ap-hl { background: rgba(77,232,225,0.10); color: var(--cyan); padding: 1px 4px; border-radius: 3px; font-weight: 500;}
        .ap-checks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .ap-checks li { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--text-dim); font-family: var(--font-mono); }
        .ap-checks .ap-tail { color: var(--text-mute); margin-left: 6px; }
        .ap-actions { display: flex; gap: 6px; align-items: center; padding-top: 8px; border-top: 1px solid var(--line); }
      `}</style>
    </div>
  );
};

Object.assign(window, { OperatingLayerSection, AgentsSection, WorkflowsSection, MemorySection, ApprovalsSection });
