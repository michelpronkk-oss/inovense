"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getPublicSignInHref, usePublicUserState } from "@/lib/public-user-state";
import EarlyAccessProvider, { useEarlyAccess, useOptionalEarlyAccess } from "@/components/early-access/early-access-provider";

export default function V3Header() {
  const sharedEarlyAccess = useOptionalEarlyAccess();
  return sharedEarlyAccess
    ? <V3HeaderContent />
    : <EarlyAccessProvider><V3HeaderContent /></EarlyAccessProvider>;
}

function V3HeaderContent() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const userState = usePublicUserState();
  const { openEarlyAccess, hasSubmitted } = useEarlyAccess();
  const signInHref = getPublicSignInHref();
  const showSignIn = userState === "guest";
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
          <Link href="/#how">How it works</Link>
          <Link href="/#operators">Operators</Link>
          <Link href="/#control">Control</Link>
          <Link href="/#pricing">Pricing</Link>
        </nav>
        <div className="cta">
          {showSignIn && <Link className="in" href={signInHref}>Sign in</Link>}
          <button type="button" className="btn btn-a" onClick={(event) => openEarlyAccess({ trigger: event.currentTarget })}>{hasSubmitted ? "Request received" : "Request early access"}</button>
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
              <Link href="/#how" onClick={closeMenu}>How it works</Link>
              <Link href="/#operators" onClick={closeMenu}>Operators</Link>
              <Link href="/#control" onClick={closeMenu}>Control</Link>
              <Link href="/#pricing" onClick={closeMenu}>Pricing</Link>
              {showSignIn && <Link href={signInHref} onClick={closeMenu}>Sign in</Link>}
            </div>
            <button type="button" className="mobile-menu-cta btn btn-a" onClick={(event) => { const menuTrigger = menuRef.current?.querySelector<HTMLElement>("summary") ?? event.currentTarget; closeMenu(); openEarlyAccess({ trigger: menuTrigger }); }}>{hasSubmitted ? "Request received" : <>Request early access <span className="arrow">→</span></>}</button>
          </nav>
        </details>
      </div>
    </header>
  );
}
