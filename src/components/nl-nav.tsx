"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { label: "Bouwen", href: "/nl/build" },
  { label: "Systemen", href: "/nl/systems" },
  { label: "Groei", href: "/nl/growth" },
  { label: "Proces", href: "/nl/process" },
];

export default function NlNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">

        {/* Logo — links to Dutch hub */}
        <Link href="/nl" className="transition-opacity hover:opacity-80">
          <Image
            src="/logo.png"
            alt="Inovense"
            width={120}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-zinc-500 transition-colors duration-150 hover:text-zinc-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-5 md:flex">
          <div className="h-4 w-px bg-zinc-800" aria-hidden="true" />
          <Link
            href="/nl/intake"
            className="rounded-full border border-brand/40 px-5 py-1.5 text-[13px] font-medium text-brand transition-colors duration-150 hover:border-brand/70 hover:bg-brand/10"
          >
            Project starten
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 md:hidden"
              aria-label="Menu openen"
            >
              <svg
                width="18"
                height="13"
                viewBox="0 0 18 13"
                fill="none"
                aria-hidden="true"
              >
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
            side="right"
            className="w-72 border-zinc-800 bg-zinc-950 px-6"
          >
            <div className="flex h-full flex-col">
              <Link href="/nl" onClick={() => setOpen(false)} className="mt-1 inline-flex">
                <Image
                  src="/logo.png"
                  alt="Inovense"
                  width={120}
                  height={28}
                  className="h-7 w-auto"
                />
              </Link>

              <nav className="mt-10 flex flex-col">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-zinc-800/60 py-4 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pb-10">
                <Link
                  href="/nl/intake"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-full bg-brand py-3 text-center text-sm font-medium text-white transition-colors hover:bg-brand/90"
                >
                  Project starten
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  );
}
