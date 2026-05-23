// Inovense — Footer
const Footer = () => {
  const cols = [
    {
      title: "Platform",
      links: ["Overview", "AI Agents", "Workflows", "Memory & context", "Approvals", "Integrations", "Security"],
    },
    {
      title: "Solutions",
      links: ["Revenue teams", "Marketing", "Client services", "Operations", "Founders & ops"],
    },
    {
      title: "Resources",
      links: ["Documentation", "API reference", "Changelog", "Status", "System architecture", "Trust center"],
    },
    {
      title: "Company",
      links: ["About", "Careers", "Customers", "Press", "Contact"],
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
                  {c.links.map((l) => <li key={l}><a href="#">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="ft-bot">
          <span>© 2026 Inovense, Inc. All rights reserved.</span>
          <div className="ft-bot-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Security</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>

      <style>{`
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

window.Footer = Footer;
