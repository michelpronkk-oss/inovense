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
  return <header className={`top ${scrolled ? "on" : ""}`}><div className="wrap"><Link href="#top" className="mark"><img src="/brand/auterim-mark-live.svg" width="20" height="20" alt="" />Auterim</Link><nav className="nav" aria-label="Main"><a href="#platform">Platform</a><a href="#operators">Operators</a><a href="#how">How it works</a><a href="#pricing">Pricing</a></nav><div className="cta"><Link className="in" href={appHref("/app")}>Sign in</Link><Link className="btn btn-a" href={appHref("/app/onboarding")}>Start preview</Link></div></div></header>;
}
