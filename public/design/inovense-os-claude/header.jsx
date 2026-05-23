// Inovense — Header
const InovenseMark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="ino-mark-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7EF6F0" />
        <stop offset="1" stopColor="#0EB8B0" />
      </linearGradient>
    </defs>
    {/* Hexagonal node, refers to "operating layer" */}
    <path
      d="M16 3 27 9.5v13L16 29 5 22.5v-13L16 3Z"
      stroke="url(#ino-mark-grad)"
      strokeWidth="1.6"
      fill="rgba(77,232,225,0.06)"
    />
    <path d="M11 12.5 16 16l5-3.5M16 16v6.5" stroke="#4DE8E1" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="16" cy="10.5" r="1.6" fill="#7EF6F0" />
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
          <a href="#signin" className="btn btn-link" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Sign in</a>
          <a href="#start" className="btn btn-primary btn-sm">
            Start free <I.arrow size={14} />
          </a>
        </div>
      </div>
    </header>
  );
};

Object.assign(window, { Header, Brand, InovenseMark });
