"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { appHref } from "@/lib/urls";

export default function V3Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`top ${scrolled ? "on" : ""}`}>
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
        <details className="mobile-menu">
          <summary aria-label="Open navigation">Menu</summary>
          <nav aria-label="Mobile navigation">
            <Link href="/#platform">Platform</Link>
            <Link href="/#operators">Operators</Link>
            <Link href="/#how">How it works</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href={appHref("/app")}>Sign in</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
