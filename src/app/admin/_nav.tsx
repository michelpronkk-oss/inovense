"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, CpuIcon, LinkIcon, MessageIcon, ShieldIcon, TargetIcon, TrendIcon, UsersIcon } from "@/components/dashboard/icons";
import { logout } from "./login/actions";

const links = [
  { href: "/", label: "Overview", icon: TargetIcon, exact: true },
  { href: "/growth", label: "Growth", icon: TrendIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/revenue", label: "Revenue", icon: ChartIcon },
  { href: "/product", label: "Product", icon: CpuIcon },
  { href: "/connectors", label: "Connectors", icon: LinkIcon },
  { href: "/operators", label: "Operators", icon: CpuIcon },
  { href: "/support", label: "Support", icon: MessageIcon },
  { href: "/feedback", label: "Feedback", icon: MessageIcon },
  { href: "/system-health", label: "System health", icon: ShieldIcon },
] as const;

export function AdminSidebar({ admin }: { admin: { email: string; role: string } }) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <Link href="/" aria-label="Auterim command center" className="admin-brand-link">
          <Image src="/brand/auterim-mark-live.svg" alt="" width={28} height={28} priority />
          <span>AUTERIM</span>
        </Link>
        <span className="admin-brand-subtitle">Command center</span>
      </div>

      <nav aria-label="Internal command center" className="admin-sidebar-nav">
        {links.map((item) => {
          const active = "exact" in item ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`admin-sidebar-link${active ? " active" : ""}`}>
              <Icon size={16} stroke={1.7} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-admin-identity">
          <span className="admin-identity-dot" aria-hidden />
          <div><strong>{admin.email}</strong><span>{admin.role.replace("_", " ")}</span></div>
        </div>
        <form action={logout}><button type="submit" className="admin-sign-out">Sign out</button></form>
      </div>
    </aside>
  );
}
