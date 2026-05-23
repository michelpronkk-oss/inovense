"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePublicUserState } from "@/lib/public-user-state";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { label: "Platform", href: "/" },
  { label: "Agents", href: "/agents" },
  { label: "Workflows", href: "/workflows" },
  { label: "Integrations", href: "/integrations" },
  { label: "Security", href: "/security" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const userState = usePublicUserState();
  const primaryCta =
    userState === "signed_in"
      ? { label: "Open dashboard", href: "/app" }
      : userState === "registered"
        ? { label: "Sign in", href: "/app" }
        : { label: "Get Started", href: "/app/onboarding" };
  const showSecondarySignIn = userState === "guest" || userState === "loading";

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent">
      <div className="mx-auto flex h-18 max-w-[1360px] items-center justify-between px-6 pt-3">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80" aria-label="Inovense">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <g fill="#ECEFF3">
              <rect x="10" y="10" width="44" height="9"/>
              <rect x="26" y="19" width="12" height="12"/>
              <rect x="26" y="33" width="12" height="12"/>
              <rect x="10" y="45" width="44" height="9"/>
            </g>
          </svg>
          <span className="text-sm font-semibold tracking-[0.16em] text-zinc-100">INOVENSE</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 rounded-full p-1.5 lg:flex"
          style={{
            background: "rgba(13,16,21,0.6)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
          }}
        >
          {links.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-150 ${
                  active
                    ? "bg-white/7 text-zinc-100"
                    : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-4 lg:flex">
          {showSecondarySignIn && (
            <Link
              href="/app"
              className="text-[13px] text-zinc-400 transition-colors duration-150 hover:text-zinc-200"
            >
              Sign in
            </Link>
          )}
          <Link
            href={primaryCta.href}
            className="rounded-xl px-5 py-2 text-[13px] font-medium text-[#04130F] transition-all duration-150 hover:-translate-y-px"
            style={{
              background: "#4DE8E1",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 24px -8px rgba(77,232,225,0.5)",
            }}
          >
            {primaryCta.label}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 lg:hidden"
              aria-label="Open menu"
            >
              <svg width="18" height="13" viewBox="0 0 18 13" fill="none" aria-hidden="true">
                <path
                  d="M1 1h16M1 6.5h10M1 12h16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </SheetTrigger>

          <SheetContent side="right" className="w-72 border-zinc-800 bg-zinc-950 px-6">
            <div className="flex h-full flex-col">

              <Link href="/" onClick={() => setOpen(false)} className="mt-1 inline-flex items-center gap-2.5" aria-label="Inovense">
                <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <g fill="#ECEFF3">
                    <rect x="10" y="10" width="44" height="9"/>
                    <rect x="26" y="19" width="12" height="12"/>
                    <rect x="26" y="33" width="12" height="12"/>
                    <rect x="10" y="45" width="44" height="9"/>
                  </g>
                </svg>
                <span className="text-sm font-semibold tracking-[0.16em] text-zinc-100">INOVENSE</span>
              </Link>

              <nav className="mt-10 flex flex-col">
                {links.map((link) => {
                  const active = isActive(link.href, pathname);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`border-b border-zinc-800/60 py-4 text-sm transition-colors ${
                        active ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {showSecondarySignIn && (
                  <Link
                    href="/app"
                    onClick={() => setOpen(false)}
                    className="border-b border-zinc-800/60 py-4 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                  >
                    Sign in
                  </Link>
                )}
              </nav>

              <div className="mt-auto pb-10">
                <Link
                  href={primaryCta.href}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-full bg-brand py-3 text-center text-sm font-medium text-white transition-colors hover:bg-brand/90"
                >
                  {primaryCta.label}
                </Link>
              </div>

            </div>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  );
}
