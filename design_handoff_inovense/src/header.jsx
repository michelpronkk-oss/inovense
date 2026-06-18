// Inovense — Header
const InovenseMark = ({ size = 22, color = "#ECEFF3" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill={color}>
    <rect x="5" y="5" width="22" height="4.5"/>
    <rect x="13" y="9.5" width="6" height="6"/>
    <rect x="13" y="16.5" width="6" height="6"/>
    <rect x="5" y="22.5" width="22" height="4.5"/>
  </svg>
);

const Brand = () => (
  <a href="#top" className="brand">
    <span className="brand-mark"><InovenseMark size={22} /></span>
    <span style={{ letterSpacing: "0.16em", fontWeight: 600, color: "#ECEFF3" }}>INOVENSE</span>
  </a>
);

const Header = () => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
      <div className="container-wide header-inner">
        <Brand />
        <nav className="nav">
          <a href="#platform" className="active">Platform</a>
          <a href="#agents">Agents</a>
          <a href="#workflows">Workflows</a>
          <a href="#integrations">Integrations</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
          <a href="#docs">Docs</a>
        </nav>
        <div className="header-cta">
          <a href="#signin" className="btn btn-link header-signin" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Sign in</a>
          <a href="#start" className="btn btn-primary btn-sm">
            Start preview <I.arrow size={14} />
          </a>
        </div>
      </div>
    </header>
  );
};

Object.assign(window, { Header, Brand, InovenseMark });
