"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent } from "react";
import { ChartIcon, CpuIcon, FlowIcon, LinkIcon, MessageIcon, ShieldIcon, TargetIcon, TrendIcon, UsersIcon } from "@/components/dashboard/icons";
import { logout } from "./login/actions";

const links = [
  { href: "/", label: "Overview", icon: TargetIcon, exact: true },
  { href: "/growth", label: "Growth", icon: TrendIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/revenue", label: "Revenue", icon: ChartIcon },
  { href: "/product", label: "Product", icon: CpuIcon },
  { href: "/system-map", label: "System Map", icon: FlowIcon },
  { href: "/connectors", label: "Connectors", icon: LinkIcon },
  { href: "/operators", label: "Operators", icon: CpuIcon },
  { href: "/support", label: "Support", icon: MessageIcon },
  { href: "/feedback", label: "Feedback", icon: MessageIcon },
  { href: "/system-health", label: "System health", icon: ShieldIcon },
] as const;

const ADMIN_ROUTE_REVISION = "20260907";

function navigateThroughAdminHost(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.location.assign(event.currentTarget.href);
}

export function AdminSidebar({ admin }: { admin: { email: string; role: string } }) {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  // On the mobile horizontal-scroll nav (see admin.css `max-width: 820px`), the
  // active route can otherwise land off-screen with no indication of where you
  // are or that more sections exist further along the strip. Scroll it into
  // view on mount/route change; a no-op on desktop, where the nav never scrolls.
  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <Link href="/" onClick={navigateThroughAdminHost} aria-label="Auterim command center" className="admin-brand-link">
          <Image src="/brand/auterim-mark-live.svg" alt="" width={28} height={28} priority />
          <span>AUTERIM</span>
        </Link>
        <span className="admin-brand-subtitle">Command center</span>
      </div>

      <nav aria-label="Internal command center" className="admin-sidebar-nav">
        {links.map((item) => {
          const active = "exact" in item ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const href = item.href === "/" ? "/" : `${item.href}?admin=${ADMIN_ROUTE_REVISION}`;
          return (
            <Link key={item.href} href={href} prefetch={false} onClick={navigateThroughAdminHost} aria-current={active ? "page" : undefined} ref={active ? activeLinkRef : undefined} className={`admin-sidebar-link${active ? " active" : ""}`}>
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
