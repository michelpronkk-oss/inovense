"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./login/actions";

const links = [
  { href: "/", label: "Overview", exact: true }, { href: "/growth", label: "Growth" }, { href: "/customers", label: "Customers" }, { href: "/revenue", label: "Revenue" }, { href: "/product", label: "Product" }, { href: "/connectors", label: "Connectors" }, { href: "/operators", label: "Operators" }, { href: "/support", label: "Support" }, { href: "/feedback", label: "Feedback" }, { href: "/system-health", label: "System health" },
] as const;

export function AdminNav({ admin }: { admin: { email: string; role: string } }) {
  const pathname = usePathname();
  return <nav aria-label="Internal command center" className="flex min-h-14 items-center gap-3 px-4 md:px-6"><Link href="/" className="shrink-0 text-xs font-semibold tracking-[.14em] text-zinc-100">AUTERIM <span className="text-zinc-600">/ COMMAND</span></Link><div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">{links.map((item) => { const active = "exact" in item ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs transition-colors ${active ? "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700/60" : "text-zinc-500 hover:text-zinc-200"}`}>{item.label}</Link>; })}</div><form action={logout} className="shrink-0"><button type="submit" className="text-[11px] text-zinc-500 hover:text-zinc-200" title={admin.email}>{admin.role.replace("_", " ")} · Sign out</button></form></nav>;
}
