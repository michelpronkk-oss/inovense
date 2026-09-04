"use client";

import Link from "next/link";
import { openCookiePreferences } from "@/lib/cookie-consent";

function Mark() {
  return (
    <span className="mk">
      <img src="/brand/auterim-mark-live.svg" width="16" height="16" alt="" />
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
            <p>The operating layer between company context and AI execution.</p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li><Link href="/#profile">Company profile</Link></li>
              <li><Link href="/#operators">Operators</Link></li>
              <li><Link href="/#run">Runs</Link></li>
              <li><Link href="/#policy">Approvals</Link></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><Link href="/#pricing">Piloting</Link></li>
              <li><Link href="/use-cases">Use cases</Link></li>
              <li><Link href="/getting-started">Getting started</Link></li>
              <li><Link href="/security">Security</Link></li>
              <li><Link href="/docs">Documentation</Link></li>
              <li><Link href="/changelog">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <span>© 2026 Auterim</span>
          <button type="button" onClick={openCookiePreferences} className="foot-cookie-btn">Cookie preferences</button>
          <span className="r">Interface examples show demo data, not customer activity.</span>
        </div>
      </div>
    </footer>
  );
}
