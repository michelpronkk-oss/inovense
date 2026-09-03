"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { appHref } from "@/lib/urls";

export default function V3Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => {
    menuRef.current?.removeAttribute("open");
    setMenuOpen(false);
  };

  return (
    <header className={`top ${scrolled ? "on" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") closeMenu(); }}>
      <div className="wrap">
        <Link href="#top" className="mark" aria-label="Auterim home">
          <img src="/brand/auterim-mark-live.svg" width="20" height="20" alt="" />
          Auterim
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#platform">Platform</Link>
          <Link href="/#operators">Operators</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#pricing">Pricing</Link>
        </nav>
        <div className="cta">
          <Link className="in" href={appHref("/app")}>Sign in</Link>
          <Link className="btn btn-a" href={appHref("/app/onboarding")}>Start preview</Link>
        </div>
        <details className="mobile-menu" ref={menuRef} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
          <summary aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation">
            <span className="mobile-menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 18" width="24" height="18" fill="none"><path d="M1 1h22M1 9h22M1 17h22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </span>
            <span className="mobile-menu-close" aria-hidden="true">&times;</span>
            <span className="sr-only">Toggle navigation</span>
          </summary>
          <nav id="mobile-navigation" aria-label="Mobile navigation">
            <div className="mobile-menu-links">
              <Link href="/#platform" onClick={closeMenu}>Platform</Link>
              <Link href="/#operators" onClick={closeMenu}>Operators</Link>
              <Link href="/#how" onClick={closeMenu}>How it works</Link>
              <Link href="/#pricing" onClick={closeMenu}>Pricing</Link>
              <Link href={appHref("/app")} onClick={closeMenu}>Sign in</Link>
            </div>
            <Link className="mobile-menu-cta btn btn-a" href={appHref("/app/onboarding")} onClick={closeMenu}>Start preview <span className="arrow">→</span></Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
