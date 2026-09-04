"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePublicUserState } from "@/lib/public-user-state";
import { appHref } from "@/lib/urls";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { label: "Platform", href: "/" },
  { label: "Agents", href: "/agents" },
  { label: "Operators", href: "/operators" },
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

export default function Nav({ homepage = false }: { homepage?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const userState = usePublicUserState();
  const primaryCta =
    userState === "signed_in"
      ? { label: "Open dashboard", href: appHref("/app") }
      : userState === "registered"
        ? { label: "Sign in", href: appHref("/app") }
        : { label: "Start preview", href: appHref("/app/onboarding") };
  const showSecondarySignIn = userState === "guest" || userState === "loading";
  const navLinks = homepage
    ? [
        { label: "Platform", href: "#platform" },
        { label: "Operators", href: "#operators" },
        { label: "How it works", href: "#how" },
        { label: "Pricing", href: "#pricing" },
      ]
    : links;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent">
      <div className="mx-auto flex h-18 max-w-[1360px] items-center justify-between px-6 pt-3">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80" aria-label="Auterim">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <g fill="#ECEFF3">
              <rect x="10" y="10" width="44" height="9"/>
              <rect x="26" y="19" width="12" height="12"/>
              <rect x="26" y="33" width="12" height="12"/>
              <rect x="10" y="45" width="44" height="9"/>
            </g>
          </svg>
          <span className="text-sm font-semibold tracking-[0.16em] text-zinc-100">AUTERIM</span>
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
          {navLinks.map((link) => {
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
              href={appHref("/app")}
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
              className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 lg:hidden"
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

          <SheetContent
            side="top"
            showCloseButton={false}
            className="!h-dvh w-full max-w-none border-zinc-800 bg-zinc-950 px-6 pt-[env(safe-area-inset-top)]"
          >
            <div className="flex h-full flex-col">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation links and primary call to action.</SheetDescription>

              <div className="flex h-18 shrink-0 items-center justify-between pt-3">
                <Link href="/" onClick={() => setOpen(false)} className="inline-flex items-center gap-2.5" aria-label="Auterim">
                  <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <g fill="#ECEFF3">
                      <rect x="10" y="10" width="44" height="9"/>
                      <rect x="26" y="19" width="12" height="12"/>
                      <rect x="26" y="33" width="12" height="12"/>
                      <rect x="10" y="45" width="44" height="9"/>
                    </g>
                  </svg>
                  <span className="text-sm font-semibold tracking-[0.16em] text-zinc-100">AUTERIM</span>
                </Link>
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="flex h-11 w-11 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </SheetClose>
              </div>

              <nav className="mt-6 flex flex-col overflow-y-auto">
                {navLinks.map((link) => {
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
                    href={appHref("/app")}
                    onClick={() => setOpen(false)}
                    className="border-b border-zinc-800/60 py-4 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                  >
                    Sign in
                  </Link>
                )}
              </nav>

              <div className="mt-auto shrink-0 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
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
