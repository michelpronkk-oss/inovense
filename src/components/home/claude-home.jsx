'use client';
/* eslint-disable react/no-unescaped-entities, react/jsx-key */
// @ts-nocheck
import React from 'react';
import './claude-home.css';
import { usePublicUserState } from '@/lib/public-user-state';
// Inovense  -  Premium line icons (24x24, 1.5 stroke)
const Icon = ({ children, size = 18, stroke = 1.5, className = "", style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

const I = {
  arrow:      (p) => <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>,
  arrowUR:    (p) => <Icon {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Icon>,
  check:      (p) => <Icon {...p}><path d="M4 12.5 9 17.5 20 6.5" /></Icon>,
  x:          (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>,
  dot:        (p) => <Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></Icon>,
  plus:       (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  spark:      (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></Icon>,
  bolt:       (p) => <Icon {...p}><path d="M13 3 5 14h6l-2 7 8-11h-6l2-7Z" /></Icon>,
  brain:      (p) => <Icon {...p}><path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 3 3h0a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm6 0a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-3 3h0a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></Icon>,
  layers:     (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 18 9 5 9-5" /></Icon>,
  shield:     (p) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /></Icon>,
  check2:     (p) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Icon>,
  cube:       (p) => <Icon {...p}><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" /><path d="M3 8l9 5 9-5M12 13v8" /></Icon>,
  database:   (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Icon>,
  flow:       (p) => <Icon {...p}><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h10M5 7v10M19 7v10M7 19h10" /></Icon>,
  inbox:      (p) => <Icon {...p}><path d="M3 13h6l1 2h4l1-2h6" /><path d="M5 5h14l2 8v6H3v-6L5 5Z" /></Icon>,
  cpu:        (p) => <Icon {...p}><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></Icon>,
  globe:      (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>,
  user:       (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></Icon>,
  users:      (p) => <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><circle cx="17" cy="6" r="3" /><path d="M14 14c4 0 8 2 8 6" /></Icon>,
  message:    (p) => <Icon {...p}><path d="M21 12a8 8 0 1 1-3-6.2L21 4l-1 4a8 8 0 0 1 1 4Z" /></Icon>,
  doc:        (p) => <Icon {...p}><path d="M14 3H6v18h12V7l-4-4Z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h4" /></Icon>,
  chart:      (p) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></Icon>,
  search:     (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>,
  settings:   (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="m19 12 1.5-1-2-3.4-1.8.7-1.4-.8L15 5h-4l-.3 2.4-1.4.8-1.8-.7-2 3.4L7 12l-1.5 1 2 3.4 1.8-.7 1.4.8L11 19h4l.3-2.4 1.4-.8 1.8.7 2-3.4L19 12Z" /></Icon>,
  filter:     (p) => <Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" /></Icon>,
  bell:       (p) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" /><path d="M10 20a2 2 0 1 0 4 0" /></Icon>,
  briefcase:  (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Icon>,
  target:     (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></Icon>,
  megaphone:  (p) => <Icon {...p}><path d="M3 11v2l13 6V5L3 11Z" /><path d="M3 13h2v6h3v-4" /><path d="M19 8a4 4 0 0 1 0 8" /></Icon>,
  swap:       (p) => <Icon {...p}><path d="M7 4 3 8l4 4" /><path d="M3 8h14a4 4 0 0 1 0 8h-2" /><path d="m17 20 4-4-4-4" /></Icon>,
  link:       (p) => <Icon {...p}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Icon>,
  clock:      (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  lock:       (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></Icon>,
  key:        (p) => <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9 3 3-3 3-2-2-2 2-2-2-3 3" /></Icon>,
  zap:        (p) => <Icon {...p}><path d="M13 3 4 14h7l-2 7 10-11h-7l1-7Z" /></Icon>,
  trend:      (p) => <Icon {...p}><path d="m3 17 6-6 4 4 8-9" /><path d="M14 6h7v7" /></Icon>,
  branch:     (p) => <Icon {...p}><circle cx="6" cy="5" r="2" /><circle cx="18" cy="5" r="2" /><circle cx="12" cy="19" r="2" /><path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 14v3" /></Icon>,
};



// Inovense  -  Header
const InovenseMark = ({ size = 22, color = "#ECEFF3" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Inovense">
    <g fill={color}>
      <rect x="10" y="10" width="44" height="9"/>
      <rect x="26" y="19" width="12" height="12"/>
      <rect x="26" y="33" width="12" height="12"/>
      <rect x="10" y="45" width="44" height="9"/>
    </g>
  </svg>
);

const Brand = () => (
  <a href="#top" className="brand">
    <span className="brand-mark"><InovenseMark size={20} /></span>
    <span style={{ letterSpacing: "0.16em", fontWeight: 600, color: "#ECEFF3", fontFamily: "var(--font-sans)" }}>INOVENSE</span>
  </a>
);

const NAV_LINKS = [
  { label: "Platform", href: "/" },
  { label: "Agents", href: "/agents" },
  { label: "Workflows", href: "/workflows" },
  { label: "Integrations", href: "/integrations" },
  { label: "Security", href: "/security" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

const Header = () => {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const userState = usePublicUserState();
  const primaryCta =
    userState === "signed_in"
      ? { label: "Open dashboard", href: "/app" }
      : userState === "registered"
        ? { label: "Sign in", href: "/app" }
        : { label: "Get Started", href: "/app/onboarding" };
  const showSignIn = userState === "guest" || userState === "loading";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
        <div className="container-wide header-inner">
          <Brand />
          <nav className="nav">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={link.href === "/" ? "active" : undefined}>{link.label}</a>
            ))}
          </nav>
          <div className="header-cta">
            {showSignIn && <a href="/app" className="btn btn-link" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Sign in</a>}
            <a href={primaryCta.href} className="btn btn-primary btn-sm">
              {primaryCta.label} <I.arrow size={14} />
            </a>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                <path d="M1 1h14M1 6h10M1 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mobile-nav-overlay${mobileOpen ? " is-open" : ""}`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      >
        <div
          className="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          onClick={(e) => e.stopPropagation()}
        >
            <div className="mobile-nav-head">
              <Brand />
              <button
                className="mobile-nav-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mobile-nav-links">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="mobile-nav-link"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              {showSignIn && (
                <a
                  href="/app"
                  className="mobile-nav-link"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </a>
              )}
            </div>

            <a
              href={primaryCta.href}
              className="mobile-nav-cta"
              onClick={() => setMobileOpen(false)}
            >
              {primaryCta.label}
            </a>
        </div>
      </div>
    </>
  );
};


// Inovense OS  -  Hero Dashboard Visual
// A premium, operational, dashboard preview.

const HeroDashboard = () => {
  return (
    <div className="ino-dash" data-screen-label="Hero Dashboard">
      <div className="ino-dash-glow-tl" />
      <div className="ino-dash-glow-br" />
      <div className="ino-dash-shell">
        <div className="ino-dash-mobile">
          <div className="ino-dash-mobile-head">
            <strong>Operator Command Center</strong>
            <span className="pill pill-cyan">Live</span>
          </div>
          <div className="ino-dash-mobile-kpis">
            {[
              ["Active operators", "8"],
              ["Pending approvals", "3"],
              ["Hours saved", "412h"],
            ].map(([label, value]) => (
              <div key={label} className="ino-dash-mobile-kpi">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
        <iframe
          title="Inovense OS dashboard preview"
          src="/app-preview"
          className="ino-dash-frame"
          loading="lazy"
        />
      </div>
      <style jsx global>{`
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
        .ino-dash-frame {
          display: block;
          width: 100%;
          min-height: 920px;
          border: 0;
          background: #06070A;
          pointer-events: none;
        }

        @media (max-width: 1100px) {
          .ino-dash-frame { min-height: 760px; }
        }

        @media (max-width: 600px) {
          .ino-dash-frame { min-height: 680px; }
        }
        .ino-dash-mobile { display: none; }
        @media (max-width: 767px) {
          .ino-dash-mobile {
            display: block;
            padding: 14px;
            background: linear-gradient(180deg, #0a0d12, #080b10);
          }
          .ino-dash-mobile-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
          }
          .ino-dash-mobile-head strong {
            font-size: 13px;
            font-weight: 500;
            color: var(--text);
            letter-spacing: -0.01em;
          }
          .ino-dash-mobile-kpis {
            display: grid;
            gap: 8px;
          }
          .ino-dash-mobile-kpi {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.03);
            box-shadow: inset 0 0 0 1px var(--line);
            padding: 10px 12px;
          }
          .ino-dash-mobile-kpi span {
            font-size: 11px;
            color: var(--text-mute);
            font-family: var(--font-mono);
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .ino-dash-mobile-kpi strong {
            font-size: 18px;
            font-weight: 500;
            color: var(--text);
            letter-spacing: -0.02em;
          }
          .ino-dash-frame { display: none; }
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
      <span className="accent">workspace/inovense</span>
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
          <div className="dash-workspace-name">Inovense</div>
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
          <div style={{ fontSize: 12, fontWeight: 500 }}>Inovense Operator</div>
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
          <span>Inovense</span>
          <span className="sep">/</span>
          <span className="cur">Overview</span>
        </div>
        <div className="dash-top-actions">
          <div className="dash-search">
            <I.search size={12} />
            <span>Search agents, workflows, runs...</span>
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
            <div className="sub">Live view of every agent, workflow and decision across Inovense.</div>
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
    { label: "Hours saved", val: "412h", delta: "~ 10 FTE weeks", icon: <I.clock size={11} />, spark: [10,14,16,20,24,28,30,34] },
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
      task: "Awaiting approval  -  new client kit (Inovense client)",
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
      title: "Proposal  -  Inovense onboarding kit",
      from: "Client Flow Operator · 4m ago",
      body: "Draft includes pricing, SOW, kickoff checklist. Memory: Acme Industries (similar scope).",
    },
    {
      tag: "follow-up", tagClass: "pill-amber",
      title: "Reply to priority lead, Series B intro",
      from: "Revenue Operator · 11m ago",
      body: "Suggests Tue 2pm slot. Stage: intro → discovery. Includes case study links.",
    },
    {
      tag: "campaign", tagClass: "pill-rose",
      title: "Outbound launch  -  Q3 industry list",
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


// Inovense  -  Hero
const HeroFloatCards = () => (
  <div className="hero-float-cards" aria-hidden="true">
    <div className="hero-float-card hero-float-card-left">
      <div className="hfc-head">
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span className="dot dot-cyan pulsing" />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>Revenue Operator</span>
        </div>
        <span className="hfc-time">2s ago</span>
      </div>
      <div className="hfc-body">
        Drafting follow-up for Meridian Partners, stage 2 of 4.
      </div>
      <div className="hfc-foot">
        <span className="hfc-metric">326 <span>actions/wk</span></span>
        <span className="hfc-delta">+38%</span>
      </div>
    </div>

    <div className="hero-float-card hero-float-card-right">
      <div className="hfc-head">
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>Approval inbox</span>
        <span className="hfc-badge">3 pending</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span className="pill pill-cyan" style={{ fontSize: 9, padding: "2px 6px", letterSpacing: "0.08em" }}>PROPOSAL</span>
      </div>
      <div className="hfc-body" style={{ marginTop: 6 }}>
        Inovense onboarding kit, pricing, SOW, kickoff checklist.
      </div>
      <div className="hfc-actions">
        <span className="hfc-btn-approve">Approve</span>
        <span className="hfc-btn-skip">Skip</span>
      </div>
    </div>
  </div>
);

const HeroScrollCue = () => (
  <div className="hero-scroll-cue" aria-hidden="true">
    <div className="hero-scroll-line" />
    <span>scroll</span>
    <div className="hero-scroll-line" />
  </div>
);

const Hero = () => {
  return (
    <section className="hero" id="top">
      <div className="hero-glow" />
      <div className="hero-grid-bg" />

      <div className="hero-fold">
        <div className="container hero-inner">
          <div className="hero-live fade-in" aria-label="Live product status">
            <span className="hero-live-dot" aria-hidden="true" />
            <span className="hero-live-stat">3 operators running</span>
            <span className="hero-live-sep" aria-hidden="true">·</span>
            <span className="hero-live-text">412h saved this week</span>
          </div>

          <h1 className="fade-in" style={{ animationDelay: ".05s" }}>
            <span className="hero-copy-desktop">Put AI operators to work inside your business.</span>
            <span className="hero-copy-mobile">AI operators inside your business.</span>
          </h1>

          <p className="hero-sub fade-in" style={{ animationDelay: ".1s" }}>
            <span className="hero-copy-desktop">
              Inovense OS connects your tools, workflows, memory and approvals so operators can execute real work safely, not just answer questions.
            </span>
            <span className="hero-copy-mobile">
              Connect tools, set policies and let operators execute work safely.
            </span>
          </p>

          <div className="hero-ctas fade-in" style={{ animationDelay: ".15s" }}>
            <a href="/app/onboarding" className="btn btn-primary btn-lg">
              Get Started <I.arrow size={14} />
            </a>
            <a href="/workflows" className="btn btn-ghost btn-lg">
              See how it works
            </a>
          </div>

          <div className="hero-stats fade-in" aria-label="Product highlights" style={{ animationDelay: ".2s" }}>
            <div className="hero-stat-item">
              <span className="hero-stat-num">50+</span>
              <span className="hero-stat-label">Connectors</span>
            </div>
            <div className="hero-stat-sep" aria-hidden="true" />
            <div className="hero-stat-item">
              <span className="hero-stat-num">99.9%</span>
              <span className="hero-stat-label">Uptime SLA</span>
            </div>
            <div className="hero-stat-sep" aria-hidden="true" />
            <div className="hero-stat-item">
              <span className="hero-stat-num">3 min</span>
              <span className="hero-stat-label">First operator</span>
            </div>
          </div>

          <div className="hero-meta fade-in" style={{ animationDelay: ".25s" }}>
            <HeroLogoRail />
            <HeroCapabilityRow />
          </div>
        </div>

        <HeroScrollCue />
      </div>

      <div className="hero-below-fold">
        <div className="container-wide">
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
};

const HeroLogoRail = () => {
  const logos = [
    { name: "Gmail", key: "gmail" },
    { name: "Slack", key: "slack" },
    { name: "HubSpot", key: "hubspot" },
    { name: "Salesforce", key: "salesforce" },
    { name: "Notion", key: "notion" },
    { name: "Linear", key: "linear" },
    { name: "Stripe", key: "stripe" },
    { name: "Intercom", key: "intercom" },
    { name: "Google Drive", key: "gdrive" },
    { name: "Outlook", key: "outlook" },
  ];
  const rail = [...logos, ...logos];
  const IntegrationMark = ({ id }) => {
    const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" };
    if (id === "gmail") return <svg {...common}><path d="M3 7.5 12 14l9-6.5" /><path d="M3 7.5V18h18V7.5" /></svg>;
    if (id === "slack") return <svg {...common}><path d="M8 4a2 2 0 0 1 2 2v5H8a2 2 0 0 1 0-4h2" /><path d="M10 14a2 2 0 0 1-2 2H6v-2a2 2 0 1 1 4 0v2" /><path d="M16 10a2 2 0 0 1-2-2V6h2a2 2 0 1 1 0 4h-2" /><path d="M14 16a2 2 0 0 1 2-2h2v2a2 2 0 1 1-4 0v-2" /></svg>;
    if (id === "hubspot") return <svg {...common}><circle cx="8" cy="12" r="3.2" /><path d="M11.2 11.2 16 8.8" /><circle cx="18" cy="8" r="2" /><path d="M8 8.8V5.4" /><circle cx="8" cy="4" r="1.6" /><path d="M11 14.2 14.8 17" /><circle cx="16" cy="18.2" r="1.8" /></svg>;
    if (id === "salesforce") return <svg {...common}><path d="M8 15c-1.8 0-3.2-1.2-3.2-2.8S6.2 9.4 8 9.4c.5-2 2.2-3.4 4.3-3.4 2.4 0 4.3 1.8 4.5 4.1 1.4.2 2.4 1.3 2.4 2.7 0 1.5-1.3 2.7-2.9 2.7H8Z" /></svg>;
    if (id === "notion") return <svg {...common}><rect x="4.5" y="4.5" width="15" height="15" rx="2" /><path d="M9 16V8l6 8V8" /></svg>;
    if (id === "linear") return <svg {...common}><path d="M5 7h8" /><path d="M5 12h14" /><path d="M5 17h8" /><circle cx="17.5" cy="7" r="1.5" /><circle cx="17.5" cy="17" r="1.5" /></svg>;
    if (id === "stripe") return <svg {...common}><path d="M17 7.2c-1.2-.7-2.6-1-4.2-1-2.7 0-4.5 1.3-4.5 3.5 0 1.8 1.3 2.8 3.4 3.3l1.1.3c1 .2 1.4.5 1.4.9 0 .6-.7 1-1.9 1-1.3 0-2.8-.5-3.9-1.3" /><path d="M8.5 18.2V6.8" /></svg>;
    if (id === "intercom") return <svg {...common}><path d="M6.8 8.2v5.6" /><path d="M10.4 7v7" /><path d="M14 7v7" /><path d="M17.6 8.2v5.6" /><path d="M6.8 16.4c1.2 1 2.8 1.6 5.2 1.6s4-.6 5.2-1.6" /></svg>;
    if (id === "gdrive") return <svg {...common}><path d="M8 5h8l4 7-4 7H8l-4-7 4-7Z" /><path d="M8 5l4 7" /><path d="M12 12h8" /><path d="M8 19l4-7" /></svg>;
    if (id === "outlook") return <svg {...common}><rect x="3.5" y="6.5" width="9" height="11" rx="1.8" /><path d="M12.5 9h8v8h-8Z" /><circle cx="8" cy="12" r="2.2" /></svg>;
    return null;
  };
  return (
    <div className="hero-logo-rail-wrap">
      <div className="hero-logo-rail-label">Works with your existing stack</div>
      <div className="hero-logo-rail-mask">
        <div className="hero-logo-rail-track">
          {rail.map((item, idx) => (
            <span key={`${item.name}-${idx}`} className="hero-logo-rail-item">
              <span className="hero-logo-rail-mark" aria-hidden><IntegrationMark id={item.key} /></span>
              <span className="hero-logo-rail-name">{item.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const HeroCapabilityRow = () => {
  const capabilities = [
    { label: "Approval-first execution", icon: <I.inbox size={13} /> },
    { label: "Company memory", icon: <I.database size={13} /> },
    { label: "Policy guardrails", icon: <I.shield size={13} /> },
    { label: "Full execution logs", icon: <I.doc size={13} /> },
  ];
  return (
    <div className="hero-cap-band" role="list" aria-label="Core capabilities">
      {capabilities.map((item, index) => (
        <div key={item.label} className="hero-cap-segment" role="listitem">
          <span className="hero-cap-icon">{item.icon}</span>
          <span>{item.label}</span>
          {index < capabilities.length - 1 && <span className="hero-cap-divider" aria-hidden />}
        </div>
      ))}
    </div>
  );
};


// Inovense  -  Product sections: operating layer, agents, workflows, memory, approvals
// All sections share the section CSS in styles.css and add small per-section pieces.

// ============================================================================
// 2. The operating layer  -  diagram
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
            memory of your business, the right to act inside policy  -  and a queue when humans
            need to weigh in. Models don't run in chat windows. They run as operators.
          </p>
        </div>

        <OperatingLayerDiagram />

        <div className="ol-row">
          {[
            { num: "01", title: "Agents that operate", body: "Specialized AI workers  -  Revenue, Marketing, Client Flow, Operations  -  each scoped to real outcomes, not chat." },
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

      <style jsx global>{`
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
// 3. AI Agents  -  feature grid
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
      hint: "Awaiting approval  -  client onboarding kit",
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

      <style jsx global>{`
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
            <p className="lede mobile-compact-copy" style={{ marginTop: 16 }}>
              Drag steps together  -  triggers, agent actions, tool calls, approvals  -  and Inovense OS
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

      <style jsx global>{`
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
    { id: "branch",  icon: <I.branch size={12} />, label: "If ICP score >= 70", sub: "Branch", x: 0, y: 255, color: "#F5C26B" },
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
      <div className="wf-mobile-list">
        {steps.map((s) => (
          <div className="wf-mobile-item" key={`m-${s.id}`}>
            <span className="wf-node-ico" style={{ color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}55`, background: `${s.color}10` }}>{s.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div className="wf-node-label">{s.label}</div>
              <div className="wf-node-sub">{s.sub}</div>
            </div>
          </div>
        ))}
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

      <style jsx global>{`
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
        .wf-mobile-list { display: none; }
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
        @media (max-width: 767px) {
          .wf-builder-head {
            align-items: flex-start;
            gap: 8px;
            flex-direction: column;
            padding: 12px;
          }
          .wf-builder-head .pill {
            display: none;
          }
          .wf-mobile-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            background: #08090c;
          }
          .wf-mobile-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 10px;
            background: linear-gradient(180deg, #11151B, #0B0E13);
            box-shadow: inset 0 0 0 1px var(--line);
          }
          .wf-canvas { display: none; }
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
            <p className="lede mobile-compact-copy" style={{ marginTop: 16 }}>
              Inovense OS continuously builds a structured understanding of your company  -  accounts,
              opportunities, projects, people, documents  -  and makes it queryable by every agent.
              Nothing happens in a context-less chat.
            </p>
            <div className="mem-list">
              {[
                ["Source-of-truth aware", "Connects directly to your CRM, docs and warehouse. Memory updates as your business updates."],
                ["Scoped retrieval", "Each agent only sees the slices of memory it's authorized to read."],
                ["Custom entities", "Define accounts, projects, deals, contracts  -  the way your team already names them."],
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

      <style jsx global>{`
        .mem-split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; }
        .mem-list { display: flex; flex-direction: column; gap: 16px; margin-top: 28px; }
        .mem-li { display: flex; gap: 12px; align-items: flex-start; }
        .mem-tick { flex: none; width: 22px; height: 22px; border-radius: 6px; background: var(--cyan-soft); color: var(--cyan); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--cyan-line); margin-top: 1px;}
        .mem-li-h { font-size: 14.5px; font-weight: 500; color: var(--text); }
        .mem-li-b { font-size: 13.5px; color: var(--text-mute); margin-top: 4px; }
        @media (max-width: 1000px) {
          .mem-split { grid-template-columns: 1fr; }
          .mem-split > :first-child { order: 2; }
          .mem-split > :last-child { order: 1; }
        }
      `}</style>
    </section>
  );
};

const MemoryVisual = () => {
  // A premium "graph view"  -  central pill with surrounding entity cards
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
          <div style={{ fontSize: 13, fontWeight: 500 }}>Inovense  -  business graph</div>
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
        { top: "8%",  left: "6%",  icon: <I.briefcase size={11} />, label: "Account", val: "Inovense Client" },
        { top: "8%",  right: "6%", icon: <I.user size={11} />,      label: "Contact", val: "Primary Stakeholder" },
        { top: "45%", left: "0%",  icon: <I.doc size={11} />,       label: "Document", val: "MSA-v4.pdf" },
        { top: "45%", right: "0%", icon: <I.trend size={11} />,     label: "Opportunity", val: "$184k · Series B" },
        { bottom: "5%", left: "12%", icon: <I.flow size={11} />,    label: "Workflow", val: "Q3 onboarding" },
        { bottom: "5%", right: "12%", icon: <I.message size={11} />, label: "Thread", val: "#inovense-pilot" },
      ].map((n, i) => (
        <div className="mem-node" key={i} style={n}>
          <span className="mem-node-ico">{n.icon}</span>
          <div>
            <div className="mem-node-label">{n.label}</div>
            <div className="mem-node-val">{n.val}</div>
          </div>
        </div>
      ))}
      <div className="mem-mobile-list">
        {[
          ["Account", "Inovense Client"],
          ["Contact", "Primary stakeholder"],
          ["Opportunity", "$184k Series B"],
          ["Workflow", "Q3 onboarding"],
          ["Thread", "#inovense-pilot"],
        ].map(([k, v]) => (
          <div className="mem-mobile-item" key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <style jsx global>{`
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
        .mem-mobile-list { display: none; }
        @media (max-width: 767px) {
          .mem-vis {
            height: auto;
            min-height: 0;
            aspect-ratio: auto;
            padding: 14px;
          }
          .mem-lines,
          .mem-node { display: none; }
          .mem-center {
            position: relative;
            top: auto;
            left: auto;
            transform: none;
            width: 100%;
          }
          .mem-mobile-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
          }
          .mem-mobile-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border-radius: 9px;
            background: rgba(255,255,255,0.03);
            box-shadow: inset 0 0 0 1px var(--line);
            padding: 9px 10px;
          }
          .mem-mobile-item span {
            font-size: 10.5px;
            color: var(--text-mute);
            text-transform: uppercase;
            font-family: var(--font-mono);
            letter-spacing: 0.06em;
          }
          .mem-mobile-item strong {
            font-size: 12.5px;
            color: var(--text);
            font-weight: 500;
            text-align: right;
          }
        }
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
            <p className="lede mobile-compact-copy" style={{ marginTop: 16 }}>
              Inovense OS makes "what AI can do" explicit. Define allow-lists, dollar limits,
              approval gates and tool scopes  -  then watch agents stay inside them. Anything risky lands in your inbox.
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

      <style jsx global>{`
        .ap-split { display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: center; }
        .ap-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 32px; max-width: 480px; }
        .ap-stat { padding: 16px; background: linear-gradient(180deg, #0D1015, #08090D); border-radius: 12px; box-shadow: inset 0 0 0 1px var(--line); }
        .ap-stat-val { font-size: 26px; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .ap-stat-lab { font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); letter-spacing: 0.05em; text-transform: uppercase; margin-top: 4px; }
        @media (max-width: 1000px) { .ap-split { grid-template-columns: 1fr; } }
        @media (max-width: 767px) {
          .ap-stats { grid-template-columns: 1fr; max-width: 100%; }
        }
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
        <span className="mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>Revenue Operator → operator@inovense.com</span>
      </div>

      <div className="ap-card-body">
        <div className="ap-section">
          <div className="ap-section-label">Proposed action</div>
          <div className="ap-action">
            <span className="dot dot-cyan" />
            <span>Send personalized reply to <strong style={{ color: "var(--text)" }}>Primary Stakeholder · Inovense Client</strong></span>
          </div>
        </div>

        <div className="ap-section">
          <div className="ap-section-label">Draft</div>
          <div className="ap-draft">
            <p>Hi there  - </p>
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
          <button className="appr-btn approve">Approve &amp; send</button>
          <button className="appr-btn edit">Edit draft</button>
          <button className="appr-btn deny">Skip</button>
          <span className="ap-kbd">⌘+↵ to approve</span>
        </div>
      </div>

      <style jsx global>{`
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
        .ap-checks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .ap-checks li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--text-dim); font-family: var(--font-mono); line-height: 1.4; }
        .ap-checks li .dot { margin-top: 4px; flex-shrink: 0; }
        .ap-checks .ap-tail { color: var(--text-faint); margin-left: 4px; }

        /* Action buttons */
        .ap-actions { display: flex; gap: 8px; align-items: center; padding-top: 12px; border-top: 1px solid var(--line); flex-wrap: wrap; }
        .ap-actions .ap-kbd { margin-left: auto; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-faint); white-space: nowrap; }
        .appr-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 11.5px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 8px;
          letter-spacing: 0.03em;
          cursor: pointer;
          border: none;
          transition: background .14s, box-shadow .14s, opacity .14s;
          white-space: nowrap;
        }
        .appr-btn.approve {
          background: rgba(77,232,225,0.12);
          color: #4DE8E1;
          box-shadow: inset 0 0 0 1px rgba(77,232,225,0.28);
        }
        .appr-btn.approve:hover { background: rgba(77,232,225,0.18); }
        .appr-btn.edit {
          background: rgba(255,255,255,0.04);
          color: var(--text-dim);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.09);
        }
        .appr-btn.edit:hover { background: rgba(255,255,255,0.08); }
        .appr-btn.deny {
          background: transparent;
          color: var(--text-mute);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .appr-btn.deny:hover { color: var(--text-dim); }

        @media (max-width: 640px) {
          .ap-checks li { font-size: 11px; }
          .ap-checks .ap-tail { display: block; margin-left: 16px; margin-top: 2px; font-size: 10.5px; color: var(--text-faint); }
          .ap-actions { gap: 6px; }
          .ap-actions .appr-btn.approve { flex: 1; padding: 8px 10px; }
          .ap-actions .ap-kbd { display: none; }
        }
      `}</style>
    </div>
  );
};


// Inovense  -  Trust / scale sections: integrations, security, onboarding, pricing, CTA, footer

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

      <style jsx global>{`
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
// 8. Dashboard preview  -  secondary deep view: execution log
// ============================================================================
const ExecutionLogSection = () => {
  const events = [
    { t: "14:02:38", agent: "Revenue", color: "#4DE8E1", level: "ok",   msg: "approve.send → external lead  -  proposed reply (id: msg_8421)" },
    { t: "14:02:32", agent: "Revenue", color: "#4DE8E1", level: "info", msg: "policy.eval > allow-list OK, first-contact requires approval  -  escalated" },
    { t: "14:02:28", agent: "Revenue", color: "#4DE8E1", level: "info", msg: "tool.call hubspot.contact.get (cache hit, 41ms)" },
    { t: "14:01:57", agent: "Marketing", color: "#A78BFA", level: "ok",   msg: "draft.publish → Q3 SEO brief, 1,420w (run #4811)" },
    { t: "14:01:14", agent: "Client Flow", color: "#5B8DEF", level: "warn", msg: "memory.miss > onboarding template not found  -  fallback used" },
    { t: "14:00:08", agent: "Operations", color: "#51D88A", level: "ok",   msg: "schedule.create > Mon weekly digest 9:00 AM" },
    { t: "13:59:41", agent: "Revenue", color: "#4DE8E1", level: "info", msg: "agent.plan > 4 steps · enrich → qualify → draft → approve" },
    { t: "13:59:02", agent: "Revenue", color: "#4DE8E1", level: "ok",   msg: "trigger.received > inbound_form.submission (req_4F8a2)" },
  ];

  return (
    <section className="section" id="logs">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Observability</span>
          <h2>Every action is logged,<br/>replayable and attributable.</h2>
          <p className="lede mobile-compact-copy">
            Inovense OS records every plan, tool call, write, decision and approval  -  at the millisecond.
            Replay any run with the same context, or roll back a write across systems.
          </p>
        </div>

        <div className="log-card">
          <div className="log-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <I.doc size={13} style={{ color: "var(--cyan)" }} />
              <strong style={{ fontSize: 13, fontWeight: 500 }}>Execution log · workspace/inovense</strong>
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
          <div className="log-mobile-feed">
            {events.map((e, i) => (
              <div className="log-mobile-card" key={`m-${i}`}>
                <div className="log-mobile-top">
                  <span className="log-t">{e.t}</span>
                  <span className={`log-level log-${e.level}`}>{e.level.toUpperCase()}</span>
                </div>
                <div className="log-mobile-agent" style={{ color: e.color }}>{e.agent}</div>
                <div className="log-mobile-msg">{e.msg}</div>
              </div>
            ))}
          </div>
          <div className="log-foot">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>showing 8 of 12,841 events</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>Replay run · Export · Stream to webhook</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
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
        .log-mobile-feed { display: none; }
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
          .log-head { padding: 10px 12px; }
          .log-head .pill { display: none; }
          .log-rows { display: none; }
          .log-mobile-feed {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 10px 12px 12px;
          }
          .log-mobile-card {
            border-radius: 10px;
            background: rgba(255,255,255,0.025);
            box-shadow: inset 0 0 0 1px var(--line);
            padding: 10px;
          }
          .log-mobile-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
          }
          .log-mobile-agent {
            font-family: var(--font-mono);
            font-size: 11px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .log-mobile-msg {
            font-size: 12.5px;
            color: var(--text);
            line-height: 1.45;
          }
          .log-foot { padding: 10px 12px; }
          .log-foot span:last-child { display: none; }
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
    { icon: <I.shield size={16} />, title: "Designed for SOC 2 readiness", body: "Policy controls, approvals, and logs are structured to support readiness programs." },
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
            Inovense OS is built for regulated industries from the floor up  -  with the controls, audits
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
          {["SOC 2 readiness", "ISO 27001 controls", "GDPR", "HIPAA-ready", "PCI-oriented controls", "CCPA"].map((b) => (
            <span className="sec-badge" key={b}><I.check2 size={13} /> {b}</span>
          ))}
        </div>
      </div>

      <style jsx global>{`
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
    { num: "02", min: "3 min", title: "Pick your first operator", body: "Start with one role  -  Revenue, Marketing, Client Flow or Operations. Templates included." },
    { num: "03", min: "5 min", title: "Set boundaries", body: "Allow-lists, dollar limits, channels and approval gates  -  explicit by design." },
    { num: "04", min: "live",  title: "Go live & expand", body: "Run inside Inovense OS. Watch outputs. Add agents as workflows prove value." },
  ];
  return (
    <section className="section" id="onboarding">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Self-serve</span>
          <h2>From zero to first operator<br/>in under 10 minutes.</h2>
          <p className="lede">
            Inovense OS is self-serve from day one. Deploy a single operator inside your boundaries,
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

      <style jsx global>{`
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
  const userState = usePublicUserState();
  const tiers = [
    {
      name: "Starter",
      tagline: "For teams starting with one controlled AI operator.",
      price: "$149",
      unit: "/mo",
      hint: "Self-serve onboarding",
      bullets: [
        "1 active operator",
        "5 connected tools",
        "2,000 actions per month",
        "Core workflows",
        "Approval inbox",
        "30-day execution logs",
        "Basic company memory",
        "Email support",
      ],
      cta: "Get Starter",
      style: "ghost",
    },
    {
      name: "Growth",
      tagline: "For teams running AI across revenue, client work and operations.",
      price: "$699",
      unit: "/mo",
      hint: "Monthly or annual",
      bullets: [
        "Up to 5 active operators",
        "15 connected tools",
        "25,000 actions per month",
        "Suggested workflows",
        "Advanced approval policies",
        "Company memory graph",
        "90-day execution logs",
        "Slack and email approvals",
        "Priority support",
      ],
      cta: "Get Growth",
      style: "primary",
      featured: true,
    },
    {
      name: "Operator",
      tagline: "For companies that want their first AI operating layer implemented with us.",
      price: "$2,500",
      unit: "/mo",
      hint: "Setup support included",
      bullets: [
        "Revenue Operator implementation",
        "Custom workflow setup",
        "Client onboarding flows",
        "Up to 12 active operators",
        "All standard connectors",
        "100,000 actions per month",
        "Advanced policy guardrails",
        "180-day audit logs",
        "Private onboarding session",
        "Dedicated success support",
      ],
      cta: "Get Operator",
      style: "ghost",
    },
    {
      name: "Enterprise",
      tagline: "For regulated, multi-team or high-volume operations.",
      price: "Custom",
      unit: "",
      hint: "Annual contract",
      bullets: [
        "Unlimited operators",
        "Custom connectors and private tools",
        "SSO and SCIM",
        "SOC 2 readiness support",
        "Data residency options",
        "Custom retention and audit logs",
        "Security review",
        "SLA and dedicated success",
        "Procurement support",
      ],
      cta: "Contact sales",
      style: "ghost",
    },
  ];

  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">Pricing</span>
          <h2>Pay for operating capacity,<br/>not seats.</h2>
          <p style={{ textAlign: "center" }}>Every plan includes the core operating layer: operators, workflows, memory, approvals, connectors, policies and execution logs. Scale by volume, complexity and support.</p>
        </div>

        <div className="pr-grid">
          {tiers.map((t) => {
            const dynamicCta =
              t.name !== "Enterprise" && userState === "signed_in"
                ? { label: "Open dashboard", href: "/app" }
                : t.name !== "Enterprise" && userState === "registered"
                  ? { label: "Sign in", href: "/app" }
                  : { label: t.cta, href: t.name === "Enterprise" || t.name === "Operator" ? "/contact" : "/app/onboarding" };
            return (
            <div className={`pr-card ${t.featured ? "pr-featured" : ""}`} key={t.name}>
              {t.featured && <span className="pr-tag">Most chosen</span>}
              <div className="pr-name">{t.name}</div>
              <div className="pr-tagline">{t.tagline}</div>
              <div className="pr-price-row">
                <span className="pr-price">{t.price}</span>
                <span className="pr-unit">{t.unit}</span>
              </div>
              <div className="pr-hint">{t.hint}</div>
              <a href={dynamicCta.href} className={`btn ${t.style === "primary" ? "btn-primary" : "btn-ghost"} pr-cta`}>
                {dynamicCta.label} <I.arrow size={13} />
              </a>
              <div className="pr-divider" />
              <ul className="pr-bullets">
                {t.bullets.map((b) => <li key={b}><I.check size={11} /> {b}</li>)}
              </ul>
            </div>
          );})}
        </div>

        <div className="pr-foot">
          <span className="mono" style={{ fontSize: 12, color: "var(--text-mute)" }}>
            Start self-serve. Upgrade when your operators need higher volume, custom workflows or private connector setup.
          </span>
        </div>
      </div>

      <style jsx global>{`
        .pr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
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
        @media (max-width: 1200px) { .pr-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 900px) { .pr-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

// ============================================================================
// 12. Final CTA
// ============================================================================
const FinalCTA = () => {
  const userState = usePublicUserState();
  const primaryCta =
    userState === "signed_in"
      ? { label: "Open dashboard", href: "/app" }
      : userState === "registered"
        ? { label: "Sign in", href: "/app" }
        : { label: "Get Started", href: "/app/onboarding" };
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
              Start with one controlled operator. Connect your tools, enforce your policies and expand into a full operating layer when the value is proven.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              <a href={primaryCta.href} className="btn btn-primary btn-lg">{primaryCta.label} <I.arrow size={14} /></a>
              <a href="/contact" className="btn btn-ghost btn-lg">Book a 20-min demo</a>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 18, color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontSize: 11.5, justifyContent: "center", flexWrap: "wrap" }}>
              <span>Operators propose</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>Policies enforce</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>Humans approve</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>Everything is logged</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
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


// Inovense  -  Footer
const Footer = () => {
  const cols = [
    {
      title: "Platform",
      links: [
        { label: "Overview", href: "/" },
        { label: "AI Agents", href: "/agents" },
        { label: "Workflows", href: "/workflows" },
        { label: "Memory & context", href: "/memory" },
        { label: "Approvals", href: "/approvals" },
        { label: "Integrations", href: "/integrations" },
        { label: "Security", href: "/security" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { label: "Revenue teams", href: "/solutions/revenue-teams" },
        { label: "Marketing", href: "/solutions/marketing" },
        { label: "Client services", href: "/solutions/client-services" },
        { label: "Operations", href: "/solutions/operations" },
        { label: "Founders & ops", href: "/solutions/founders-ops" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "API reference", href: "/api-reference" },
        { label: "Changelog", href: "/changelog" },
        { label: "Status", href: "/status" },
        { label: "System architecture", href: "/architecture" },
        { label: "Trust center", href: "/trust" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Customers", href: "/customers" },
        { label: "Press", href: "/press" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ];
  return (
    <footer className="footer">
      <div className="container-wide">
        <div className="ft-top">
          <div className="ft-brand">
            <Brand />
            <p style={{ marginTop: 18, maxWidth: 320, fontSize: 14, color: "var(--text-mute)" }}>
              The AI operating layer for modern businesses. Built for serious operators.
            </p>
            <div className="ft-status">
              <span className="dot dot-green" />
              <span>All systems operational</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span>v1.18.2</span>
            </div>
          </div>
          <div className="ft-cols">
            {cols.map((c) => (
              <div key={c.title} className="ft-col">
                <div className="label" style={{ marginBottom: 14 }}>{c.title}</div>
                <ul>
                  {c.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="ft-bot">
          <span>© 2026 Inovense, Inc. All rights reserved.</span>
          <div className="ft-bot-links">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/security">Security</a>
            <a href="/cookies">Cookies</a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ft-top { display: grid; grid-template-columns: 1.2fr 2.4fr; gap: 60px; padding-bottom: 56px; border-bottom: 1px solid var(--line); }
        .ft-status {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 22px;
          padding: 6px 12px;
          background: rgba(255,255,255,0.02);
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px var(--line);
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
        }
        .ft-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; }
        .ft-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .ft-col a { color: var(--text-dim); font-size: 13.5px; transition: color .15s ease; }
        .ft-col a:hover { color: var(--cyan); }
        .ft-bot {
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          padding-top: 28px;
          font-family: var(--font-mono); font-size: 11.5px;
          color: var(--text-mute);
        }
        .ft-bot-links { display: flex; gap: 20px; }
        .ft-bot-links a:hover { color: var(--cyan); }
        @media (max-width: 1000px) {
          .ft-top { grid-template-columns: 1fr; gap: 40px; }
          .ft-cols { grid-template-columns: 1fr 1fr; gap: 30px; }
          .ft-bot { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </footer>
  );
};

export default function ClaudeHome() {
  return (
    <div className="inovense-os">
      <Header />
      <main>
        <Hero />
        <OperatingLayerSection />
        <AgentsSection />
        <WorkflowsSection />
        <MemorySection />
        <ApprovalsSection />
        <IntegrationsSection />
        <ExecutionLogSection />
        <SecuritySection />
        <OnboardingSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
