"use client";

import Link from "next/link";
import Image from "next/image";
import { openCookiePreferences } from "@/lib/cookie-consent";

const FOOTER_GROUPS = [
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Operators", href: "/operators" },
      { label: "Connectors", href: "/connectors" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "Getting started", href: "/getting-started" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

function Mark() {
  return (
    <span className="mk">
      <Image src="/brand/auterim-mark-live.svg" width={16} height={16} alt="" />
      Auterim
    </span>
  );
}

export default function V3Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link href="/" className="mark"><Mark /></Link>
            <p>Auterim finds the work before your team has to.</p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h4>{group.title}</h4>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-base">
          <span>© 2026 Auterim</span>
          <button type="button" onClick={openCookiePreferences} className="foot-cookie-btn">Cookie preferences</button>
        </div>
      </div>
    </footer>
  );
}
