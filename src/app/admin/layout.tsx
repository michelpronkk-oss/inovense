import { headers } from "next/headers";
import type { Metadata } from "next";
import { type ReactNode } from "react";
import { AdminSidebar } from "./_nav";
import { requireInternalAdmin } from "@/lib/admin/auth";
import "./admin.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (pathname === "/admin/login") return <>{children}</>;

  const admin = await requireInternalAdmin();
  return (
    <div className="admin-shell">
      <AdminSidebar admin={admin} />
      <div className="admin-shell-main">
        <header className="admin-utility-bar"><span>Internal intelligence</span><span>Verified staff access</span></header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
