import { headers } from "next/headers";
import { type ReactNode } from "react";
import type { Metadata } from "next";
import { AdminNav } from "./_nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/92 backdrop-blur-sm">
        {/* Gradient accent line */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.5) 40%, rgba(73,160,164,0.5) 60%, transparent 100%)",
          }}
        />

        <div className="mx-auto max-w-7xl">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>

    </div>
  );
}

