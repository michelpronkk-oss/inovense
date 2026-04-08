import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { type ReactNode } from "react";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { logout } from "./login/actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/creative", label: "Creative" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // Login page: render without the CRM shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/95 backdrop-blur-sm">
        {/* Gradient accent line */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.5) 40%, rgba(73,160,164,0.5) 60%, transparent 100%)",
          }}
        />

        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center transition-opacity hover:opacity-80">
              <Image
                src="/logo.png"
                alt="Inovense"
                width={96}
                height={22}
                className="block h-[22px] w-auto"
              />
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              CRM
            </span>
          </div>

          {/* Nav + sign out */}
          <div className="flex items-center gap-1">
            {ADMIN_NAV_LINKS.map((item) => {
              const isActive = "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-zinc-800/70 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            <span className="mx-1.5 h-4 w-px bg-zinc-800" aria-hidden />

            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>

    </div>
  );
}
