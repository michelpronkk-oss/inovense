// Inovense OS — Hero Dashboard Visual
// A premium, operational, dashboard preview.

const HeroDashboard = () => {
  return (
    <div className="ino-dash" data-screen-label="Hero Dashboard">
      <div className="ino-dash-glow-tl" />
      <div className="ino-dash-glow-br" />
      <div className="ino-dash-shell">
        <DashChrome />
        <div className="ino-dash-body">
          <DashSidebar />
          <DashMain />
        </div>
      </div>
      <style>{`
        .ino-dash {
          position: relative;
          border-radius: 18px;
          padding: 1px;
          background: linear-gradient(180deg, rgba(77,232,225,0.22), rgba(255,255,255,0.04) 30%, rgba(0,0,0,0));
          box-shadow:
            0 60px 120px -40px rgba(0,0,0,0.8),
            0 30px 60px -20px rgba(77,232,225,0.12);
        }
        .ino-dash-glow-tl, .ino-dash-glow-br {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
        }
        .ino-dash-glow-tl { top: -120px; left: -80px; background: rgba(77,232,225,0.18); }
        .ino-dash-glow-br { bottom: -160px; right: -80px; background: rgba(91,141,239,0.12); }
        .ino-dash-shell {
          position: relative;
          border-radius: 17px;
          background: #07090C;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
        }
        .ino-dash-body {
          display: grid;
          grid-template-columns: 224px 1fr;
          min-height: 640px;
        }

        /* Chrome */
        .dash-chrome {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: linear-gradient(180deg, #0A0D12, #07090C);
          border-bottom: 1px solid var(--line);
        }
        .dash-lights { display: flex; gap: 7px; }
        .dash-lights span { width: 10px; height: 10px; border-radius: 50%; background: #21262E; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04); }
        .dash-urlbar {
          flex: 1;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          box-shadow: inset 0 0 0 1px var(--line);
          color: var(--text-mute);
          font-family: var(--font-mono);
          font-size: 11.5px;
        }
        .dash-urlbar .accent { color: var(--cyan); }
        .dash-chrome-right { display: flex; align-items: center; gap: 10px; color: var(--text-mute); }

        /* Sidebar */
        .dash-side {
          background: linear-gradient(180deg, #08090D, #06080B);
          border-right: 1px solid var(--line);
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dash-workspace {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
          box-shadow: inset 0 0 0 1px var(--line);
          margin-bottom: 6px;
        }
        .dash-workspace-mark {
          width: 24px; height: 24px;
          border-radius: 7px;
          background: linear-gradient(135deg, #1a3a3a, #06262a);
          color: var(--cyan);
          display: grid; place-items: center;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          box-shadow: inset 0 0 0 1px var(--cyan-line);
        }
        .dash-workspace-name { font-size: 12.5px; font-weight: 500; }
        .dash-workspace-sub { font-size: 10.5px; color: var(--text-mute); font-family: var(--font-mono); }

        .dash-side-label {
          padding: 14px 12px 6px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .dash-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 10px;
          font-size: 12.5px;
          color: var(--text-dim);
          border-radius: 8px;
          cursor: pointer;
        }
        .dash-nav-item:hover { background: rgba(255,255,255,0.03); color: var(--text); }
        .dash-nav-item.active {
          background: rgba(77,232,225,0.08);
          color: var(--cyan);
          box-shadow: inset 0 0 0 1px rgba(77,232,225,0.18);
        }
        .dash-nav-item .ico { display: grid; place-items: center; width: 18px; height: 18px; }
        .dash-nav-item .badge {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: var(--text-dim);
        }
        .dash-nav-item.active .badge { background: rgba(77,232,225,0.18); color: var(--cyan); }
        .dash-side-bottom { margin-top: auto; padding: 12px 10px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 10px; }
        .dash-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #4DE8E1, #5B8DEF); color: #04130F; display: grid; place-items: center; font-size: 11px; font-weight: 600; }

        /* Main */
        .dash-main {
          padding: 22px 28px 28px;
          background:
            radial-gradient(800px 400px at 80% -100px, rgba(77,232,225,0.05), transparent 60%),
            #07090C;
          display: flex; flex-direction: column; gap: 22px;
          min-width: 0;
        }
        .dash-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .dash-breadcrumb { display: flex; align-items: center; gap: 8px; color: var(--text-mute); font-size: 12px; font-family: var(--font-mono); }
        .dash-breadcrumb .sep { color: var(--text-faint); }
        .dash-breadcrumb .cur { color: var(--text); }
        .dash-top-actions { display: flex; gap: 8px; align-items: center; }
        .dash-search {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          box-shadow: inset 0 0 0 1px var(--line);
          color: var(--text-mute);
          font-size: 12px;
          min-width: 200px;
        }
        .dash-iconbtn {
          width: 28px; height: 28px;
          display: grid; place-items: center;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          box-shadow: inset 0 0 0 1px var(--line);
          color: var(--text-dim);
          position: relative;
        }
        .dash-iconbtn .ping {
          position: absolute; top: 4px; right: 4px;
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--cyan); box-shadow: 0 0 6px var(--cyan);
        }

        .dash-heading h2 { font-size: 22px; letter-spacing: -0.02em; }
        .dash-heading .sub { font-size: 13px; color: var(--text-mute); margin-top: 2px; }
        .dash-heading-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap;}

        /* Stat row */
        .dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .dash-stat {
          padding: 14px 14px 12px;
          border-radius: 12px;
          background: linear-gradient(180deg, #0F1218, #0B0E13);
          box-shadow: inset 0 0 0 1px var(--line);
          position: relative;
          overflow: hidden;
        }
        .dash-stat .label { display: flex; align-items: center; gap: 6px; color: var(--text-mute); font-size: 11px; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
        .dash-stat .label .ico { display: grid; place-items: center; }
        .dash-stat .val { font-size: 24px; font-weight: 500; letter-spacing: -0.02em; margin-top: 8px; font-variant-numeric: tabular-nums; }
        .dash-stat .delta { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 10.5px; margin-top: 6px; color: var(--green); }
        .dash-stat .delta.neg { color: var(--rose); }
        .dash-stat .delta.neutral { color: var(--text-mute); }
        .dash-stat .spark {
          position: absolute; right: 12px; bottom: 12px; width: 70px; height: 28px; opacity: 0.9;
        }

        /* Two-col grid */
        .dash-grid {
          display: grid;
          grid-template-columns: 1.55fr 1fr;
          gap: 14px;
          min-height: 320px;
        }
        .panel {
          background: linear-gradient(180deg, #0E1218, #0A0D12);
          border-radius: 12px;
          box-shadow: inset 0 0 0 1px var(--line);
          padding: 14px 0 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .panel-head { display: flex; align-items: center; justify-content: space-between; padding: 0 16px 12px; border-bottom: 1px solid var(--line); }
        .panel-head h3 { font-size: 13px; font-weight: 500; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
        .panel-head .meta { display: flex; align-items: center; gap: 8px; font-size: 11px; font-family: var(--font-mono); color: var(--text-mute); }
        .panel-head .tabs { display: flex; gap: 2px; padding: 2px; background: rgba(255,255,255,0.025); border-radius: 7px; box-shadow: inset 0 0 0 1px var(--line); }
        .panel-head .tabs span { padding: 3px 8px; font-size: 11px; color: var(--text-mute); border-radius: 5px; font-family: var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; }
        .panel-head .tabs span.active { color: var(--text); background: rgba(255,255,255,0.05); }

        /* Agents table */
        .agent-row {
          display: grid;
          grid-template-columns: 1.4fr 1.5fr 0.8fr 60px;
          align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid var(--line);
          gap: 10px;
        }
        .agent-row:last-child { border-bottom: none; }
        .agent-row .ag-name { display: flex; align-items: center; gap: 10px; }
        .agent-row .ag-avatar {
          width: 28px; height: 28px;
          border-radius: 8px;
          display: grid; place-items: center;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--cyan);
          background: linear-gradient(135deg, #0F2E2C, #061A19);
          box-shadow: inset 0 0 0 1px rgba(77,232,225,0.16);
        }
        .agent-row .ag-meta { font-size: 13px; font-weight: 500; }
        .agent-row .ag-sub { font-size: 11px; color: var(--text-mute); font-family: var(--font-mono); }
        .agent-row .ag-task { color: var(--text-dim); font-size: 12.5px; display: flex; align-items: center; gap: 6px; }
        .agent-row .ag-task .status { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 10.5px; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.06em; }
        .agent-row .ag-metric { display: flex; align-items: baseline; gap: 4px; font-variant-numeric: tabular-nums; }
        .agent-row .ag-metric .num { font-size: 14px; font-weight: 500; }
        .agent-row .ag-metric .unit { font-size: 10.5px; color: var(--text-mute); font-family: var(--font-mono); }
        .agent-row .ag-mini {
          height: 22px; width: 100%;
        }
        .agent-row .ag-act {
          font-size: 11px; font-family: var(--font-mono);
          color: var(--text-mute);
          text-align: right;
        }

        /* Approvals */
        .appr-list { display: flex; flex-direction: column; }
        .appr-item {
          display: flex; flex-direction: column; gap: 6px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
        }
        .appr-item:last-child { border-bottom: none; }
        .appr-top { display: flex; align-items: center; gap: 8px; }
        .appr-top .tag {
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .appr-title { font-size: 12.5px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .appr-from { color: var(--text-mute); font-size: 11px; font-family: var(--font-mono); }
        .appr-body { font-size: 12px; color: var(--text-dim); line-height: 1.4; padding-left: 0; }
        .appr-actions { display: flex; gap: 6px; margin-top: 2px; }
        .appr-btn {
          font-family: var(--font-mono);
          font-size: 10.5px;
          padding: 3px 8px;
          border-radius: 5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .appr-btn.approve { background: var(--cyan-soft); color: var(--cyan); box-shadow: inset 0 0 0 1px var(--cyan-line); }
        .appr-btn.edit { background: rgba(255,255,255,0.03); color: var(--text-dim); box-shadow: inset 0 0 0 1px var(--line); }
        .appr-btn.deny { background: rgba(255,255,255,0.02); color: var(--text-mute); box-shadow: inset 0 0 0 1px var(--line); }

        /* Workflow strip */
        .workflow {
          padding: 12px 16px 16px;
          background: linear-gradient(180deg, #0C1015, #090C10);
          border-radius: 12px;
          box-shadow: inset 0 0 0 1px var(--line);
          position: relative;
          overflow: hidden;
        }
        .workflow-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .workflow-head h3 { font-size: 13px; font-weight: 500; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
        .workflow-svg { width: 100%; height: 130px; display: block; }

        @media (max-width: 1100px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr); }
          .dash-grid { grid-template-columns: 1fr; }
          .ino-dash-body { grid-template-columns: 1fr; }
          .dash-side { display: none; }
        }
        @media (max-width: 600px) {
          .dash-main { padding: 16px; }
        }
      `}</style>
    </div>
  );
};

const DashChrome = () => (
  <div className="dash-chrome">
    <div className="dash-lights"><span /><span /><span /></div>
    <div className="dash-urlbar">
      <I.lock size={11} />
      <span>app.inovense.com</span>
      <span style={{ color: "var(--text-faint)" }}>/</span>
      <span className="accent">workspace/atlas-co</span>
      <span style={{ color: "var(--text-faint)" }}>/</span>
      <span>overview</span>
    </div>
    <div className="dash-chrome-right">
      <span className="kbd">⌘K</span>
    </div>
  </div>
);

const DashSidebar = () => {
  const items = [
    { icon: <I.target size={14} />, label: "Overview", active: true },
    { icon: <I.cpu size={14} />, label: "Agents", badge: "8" },
    { icon: <I.flow size={14} />, label: "Workflows", badge: "24" },
    { icon: <I.inbox size={14} />, label: "Approvals", badge: "3" },
    { icon: <I.database size={14} />, label: "Memory" },
    { icon: <I.link size={14} />, label: "Connectors" },
    { icon: <I.doc size={14} />, label: "Execution logs" },
    { icon: <I.chart size={14} />, label: "Insights" },
  ];
  const admin = [
    { icon: <I.users size={14} />, label: "Team" },
    { icon: <I.shield size={14} />, label: "Policies" },
    { icon: <I.settings size={14} />, label: "Settings" },
  ];
  return (
    <aside className="dash-side">
      <div className="dash-workspace">
        <div className="dash-workspace-mark">A</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dash-workspace-name">Atlas & Co.</div>
          <div className="dash-workspace-sub">production</div>
        </div>
        <I.swap size={12} style={{ color: "var(--text-mute)" }} />
      </div>

      <div className="dash-side-label">Operations</div>
      {items.map((it) => (
        <div key={it.label} className={`dash-nav-item ${it.active ? "active" : ""}`}>
          <span className="ico">{it.icon}</span>
          <span>{it.label}</span>
          {it.badge && <span className="badge">{it.badge}</span>}
        </div>
      ))}

      <div className="dash-side-label">Administration</div>
      {admin.map((it) => (
        <div key={it.label} className="dash-nav-item">
          <span className="ico">{it.icon}</span>
          <span>{it.label}</span>
        </div>
      ))}

      <div className="dash-side-bottom">
        <div className="dash-avatar">JD</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Jordan Devlin</div>
          <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>Operator · Admin</div>
        </div>
      </div>
    </aside>
  );
};

const DashMain = () => {
  return (
    <main className="dash-main">
      <div className="dash-top">
        <div className="dash-breadcrumb">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span>Atlas & Co.</span>
          <span className="sep">/</span>
          <span className="cur">Overview</span>
        </div>
        <div className="dash-top-actions">
          <div className="dash-search">
            <I.search size={12} />
            <span>Search agents, workflows, runs…</span>
            <span style={{ marginLeft: "auto" }} className="kbd">⌘K</span>
          </div>
          <div className="dash-iconbtn"><I.bell size={14} /><span className="ping" /></div>
          <div className="dash-iconbtn"><I.settings size={14} /></div>
        </div>
      </div>

      <div className="dash-heading">
        <div className="dash-heading-row">
          <div>
            <h2>Operator Command Center</h2>
            <div className="sub">Live view of every agent, workflow and decision across Atlas & Co.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm"><I.filter size={12} /> Last 7 days</button>
            <button className="btn btn-primary btn-sm"><I.plus size={12} /> Deploy agent</button>
          </div>
        </div>
      </div>

      <StatRow />

      <div className="dash-grid">
        <AgentsPanel />
        <ApprovalsPanel />
      </div>

      <WorkflowStrip />
    </main>
  );
};

const Spark = ({ data = [3, 5, 4, 6, 5, 8, 7, 9, 8, 10, 11, 13], color = "#4DE8E1" }) => {
  const w = 70, h = 28, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark">
      <defs>
        <linearGradient id={`spark-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#spark-${color.slice(1)})`} />
    </svg>
  );
};

const StatRow = () => {
  const stats = [
    { label: "Active agents", val: "8", delta: "+2 this week", icon: <I.cpu size={11} />, spark: [4,5,4,6,7,6,7,8] },
    { label: "Approvals pending", val: "3", delta: "Median 4m to review", deltaClass: "neutral", icon: <I.inbox size={11} />, spark: [2,4,3,5,3,4,3,3], color: "#F5C26B" },
    { label: "Tasks completed", val: "1,284", delta: "+38.4% vs last 7d", icon: <I.check size={11} />, spark: [12,18,16,22,28,26,32,38] },
    { label: "Hours saved", val: "412h", delta: "≈ 10 FTE weeks", icon: <I.clock size={11} />, spark: [10,14,16,20,24,28,30,34] },
  ];
  return (
    <div className="dash-stats">
      {stats.map((s) => (
        <div className="dash-stat" key={s.label}>
          <div className="label"><span className="ico">{s.icon}</span> {s.label}</div>
          <div className="val">{s.val}</div>
          <div className={`delta ${s.deltaClass || ""}`}>{s.delta}</div>
          <Spark data={s.spark} color={s.color || "#4DE8E1"} />
        </div>
      ))}
    </div>
  );
};

const AgentsPanel = () => {
  const agents = [
    {
      mark: "RV", color: "#4DE8E1",
      name: "Revenue Operator", role: "Sales · Pipeline",
      task: "Drafting follow-ups for 14 leads in stage 2",
      status: "running",
      metric: { num: "326", unit: "actions / wk" },
      spark: [3,5,4,7,8,7,9,11,10,12,13,14],
    },
    {
      mark: "MK", color: "#A78BFA",
      name: "Marketing Operator", role: "Content · SEO",
      task: "Generating Q3 campaign brief from research notes",
      status: "running",
      metric: { num: "118", unit: "outputs / wk" },
      spark: [4,4,5,6,5,7,8,9,8,10,9,11],
    },
    {
      mark: "CF", color: "#5B8DEF",
      name: "Client Flow Operator", role: "Intake · Onboarding",
      task: "Awaiting approval — new client kit (Northwind Co.)",
      status: "awaiting",
      metric: { num: "42", unit: "intakes / wk" },
      spark: [2,3,4,3,5,4,5,4,5,6,5,7],
    },
    {
      mark: "OP", color: "#51D88A",
      name: "Operations Operator", role: "Reports · Internal",
      task: "Compiling weekly summary across 6 channels",
      status: "running",
      metric: { num: "9.2h", unit: "saved / wk" },
      spark: [5,6,6,7,8,7,9,10,11,10,12,13],
    },
  ];
  return (
    <div className="panel">
      <div className="panel-head">
        <h3><I.cpu size={13} /> Active agents</h3>
        <div className="meta">
          <div className="tabs">
            <span className="active">All</span>
            <span>Running</span>
            <span>Paused</span>
          </div>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span>4 of 8 shown</span>
        </div>
      </div>
      <div>
        {agents.map((a) => (
          <div className="agent-row" key={a.name}>
            <div className="ag-name">
              <div className="ag-avatar" style={{ color: a.color, boxShadow: `inset 0 0 0 1px ${a.color}40`, background: `linear-gradient(135deg, ${a.color}22, ${a.color}08)` }}>{a.mark}</div>
              <div>
                <div className="ag-meta">{a.name}</div>
                <div className="ag-sub">{a.role}</div>
              </div>
            </div>
            <div>
              <div className="ag-task">{a.task}</div>
              <div className="ag-task" style={{ marginTop: 4 }}>
                {a.status === "running" ? (
                  <span className="status" style={{ color: a.color }}><span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} /> Running</span>
                ) : (
                  <span className="status" style={{ color: "var(--amber)" }}><span className="dot dot-amber pulsing" /> Awaiting approval</span>
                )}
              </div>
            </div>
            <div className="ag-metric">
              <div>
                <div><span className="num">{a.metric.num}</span> <span className="unit">{a.metric.unit}</span></div>
                <svg viewBox="0 0 100 22" className="ag-mini" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`mini-${a.mark}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={a.color} stopOpacity="0.3" />
                      <stop offset="1" stopColor={a.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const max = Math.max(...a.spark), min = Math.min(...a.spark);
                    const pts = a.spark.map((d, i) => {
                      const x = (i / (a.spark.length - 1)) * 100;
                      const y = 22 - ((d - min) / (max - min || 1)) * 18 - 2;
                      return `${x},${y}`;
                    }).join(" ");
                    return (<>
                      <polyline points={pts} fill="none" stroke={a.color} strokeWidth="1.2" />
                      <polygon points={`0,22 ${pts} 100,22`} fill={`url(#mini-${a.mark})`} />
                    </>);
                  })()}
                </svg>
              </div>
            </div>
            <div className="ag-act">Manage <I.arrow size={10} style={{ verticalAlign: -1 }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ApprovalsPanel = () => {
  const items = [
    {
      tag: "proposal", tagClass: "pill-cyan",
      title: "Proposal — Northwind onboarding kit",
      from: "Client Flow Operator · 4m ago",
      body: "Draft includes pricing, SOW, kickoff checklist. Memory: Acme Industries (similar scope).",
    },
    {
      tag: "follow-up", tagClass: "pill-amber",
      title: "Reply to Aiko Tanaka, Series B intro",
      from: "Revenue Operator · 11m ago",
      body: "Suggests Tue 2pm slot. Stage: intro → discovery. Includes case study links.",
    },
    {
      tag: "campaign", tagClass: "pill-rose",
      title: "Outbound launch — Q3 industry list",
      from: "Marketing Operator · 28m ago",
      body: "320 contacts, 3 segments. Will pause if reply rate < 4% within 48h.",
    },
  ];
  return (
    <div className="panel">
      <div className="panel-head">
        <h3><I.inbox size={13} /> Approval inbox</h3>
        <div className="meta">
          <span><span className="dot dot-cyan pulsing" style={{ marginRight: 6, verticalAlign: 1 }} /> 3 waiting</span>
        </div>
      </div>
      <div className="appr-list">
        {items.map((it, i) => (
          <div className="appr-item" key={i}>
            <div className="appr-top">
              <span className={`pill ${it.tagClass}`}>{it.tag}</span>
              <span className="appr-title">{it.title}</span>
            </div>
            <div className="appr-from">{it.from}</div>
            <div className="appr-body">{it.body}</div>
            <div className="appr-actions">
              <span className="appr-btn approve">Approve</span>
              <span className="appr-btn edit">Edit</span>
              <span className="appr-btn deny">Skip</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkflowStrip = () => {
  // Node graph: source → agent → workflow steps → output
  return (
    <div className="workflow">
      <div className="workflow-head">
        <h3><I.flow size={13} /> Live workflow · Revenue Operator › New inbound lead</h3>
        <div className="meta" style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--text-mute)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <span><span className="dot dot-cyan pulsing" style={{ marginRight: 6, verticalAlign: 1 }} /> Run #4,812 · 00:00:14</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span>3 steps remaining</span>
        </div>
      </div>
      <svg viewBox="0 0 1180 130" className="workflow-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wf-line" x1="0" x2="1">
            <stop offset="0" stopColor="#4DE8E1" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#4DE8E1" stopOpacity="0.55" />
            <stop offset="1" stopColor="#4DE8E1" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="wf-node" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#13171F" />
            <stop offset="1" stopColor="#0A0D12" />
          </linearGradient>
        </defs>
        {/* Connector lines */}
        {[
          [128, 280], [320, 472], [512, 664], [704, 856], [896, 1048],
        ].map(([x1, x2], i) => (
          <line
            key={i}
            x1={x1} y1="65" x2={x2} y2="65"
            stroke="url(#wf-line)"
            strokeWidth="1.4"
            strokeDasharray="4 4"
            style={{ animation: `flowDash ${1.6 + i * 0.1}s linear infinite` }}
          />
        ))}
        {/* Nodes */}
        {[
          { x: 24, w: 104, label: "Trigger", sub: "Inbound form", icon: "↘", color: "#A4ABB4", done: true },
          { x: 216, w: 104, label: "Enrich", sub: "Memory + Clearbit", icon: "✦", color: "#A78BFA", done: true },
          { x: 408, w: 104, label: "Qualify", sub: "Revenue agent", icon: "◆", color: "#4DE8E1", done: true },
          { x: 600, w: 104, label: "Draft reply", sub: "GPT + memory", icon: "▤", color: "#4DE8E1", active: true },
          { x: 792, w: 104, label: "Approve", sub: "Human-in-loop", icon: "✓", color: "#F5C26B", pending: true },
          { x: 984, w: 172, label: "Send & log", sub: "Gmail · HubSpot · CRM", icon: "→", color: "#51D88A" },
        ].map((n, i) => (
          <g key={i} transform={`translate(${n.x}, 36)`}>
            <rect width={n.w} height={58} rx="8" fill="url(#wf-node)" stroke={n.active ? n.color : "rgba(255,255,255,0.10)"} strokeWidth={n.active ? 1.4 : 1} />
            <circle cx="14" cy="14" r="3" fill={n.done ? "#51D88A" : n.active ? n.color : n.pending ? "#F5C26B" : "#4A4F57"} />
            <text x="26" y="18" fill="#A4ABB4" fontSize="10" fontFamily="'Geist Mono', monospace" letterSpacing="0.06em">{`STEP ${i + 1}`}</text>
            <text x="14" y="38" fill="#ECEFF3" fontSize="13" fontWeight="500" fontFamily="'Geist', sans-serif">{n.label}</text>
            <text x="14" y="52" fill="#6B7178" fontSize="10.5" fontFamily="'Geist Mono', monospace">{n.sub}</text>
            {n.active && (
              <rect width={n.w} height={58} rx="8" fill="none" stroke={n.color} strokeOpacity="0.35" strokeWidth="3">
                <animate attributeName="stroke-opacity" values="0.35;0.05;0.35" dur="2s" repeatCount="indefinite" />
              </rect>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

Object.assign(window, { HeroDashboard });
