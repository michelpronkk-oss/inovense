// Inovense — Hero
const Hero = () => {
  return (
    <section className="hero" id="top">
      <div className="hero-glow" />
      <div className="hero-grid-bg" />
      <div className="container hero-inner">
        <div className="hero-trust fade-in">
          <span className="hero-trust-pill">
            <span className="dot dot-cyan" /> Now in preview
          </span>
          <span>Inovense OS v1 — for AI-native operating teams</span>
          <I.arrow size={12} style={{ color: "var(--text-mute)" }} />
        </div>

        <h1 className="fade-in" style={{ animationDelay: ".05s" }}>
          The operating layer<br />
          between your company<br />
          <span className="accent">and AI.</span>
        </h1>

        <p className="hero-sub fade-in" style={{ animationDelay: ".1s" }}>
          Inovense OS connects AI agents to your real workflows, approvals, memory, and outputs —
          so software can take operational work to completion, not just answer questions.
        </p>

        <div className="hero-ctas fade-in" style={{ animationDelay: ".15s" }}>
          <a href="#start" className="btn btn-primary btn-lg">
            Start free <I.arrow size={14} />
          </a>
          <a href="#demo" className="btn btn-ghost btn-lg">
            Watch product tour
          </a>
        </div>

        <div className="hero-meta fade-in" style={{ animationDelay: ".2s" }}>
          <HeroLogoStrip />
        </div>
      </div>

      <div className="container-wide" style={{ marginTop: 56 }}>
        <HeroDashboard />
      </div>
    </section>
  );
};

const HeroLogoStrip = () => {
  const logos = ["Linear", "Notion", "Stripe", "HubSpot", "Slack", "Salesforce", "Intercom"];
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      marginTop: 8, color: "var(--text-faint)", fontFamily: "var(--font-mono)",
      fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase"
    }}>
      <span style={{ color: "var(--text-mute)" }}>Connects with</span>
      <span style={{ width: 1, height: 12, background: "var(--line-2)" }} />
      <div style={{ display: "flex", gap: 22 }}>
        {logos.map((l) => (
          <span key={l} style={{ color: "var(--text-mute)" }}>{l}</span>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { Hero });
