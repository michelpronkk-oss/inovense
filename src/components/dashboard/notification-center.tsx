"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon } from "@/components/dashboard/icons";
import type { WorkspaceNotification } from "@/lib/notifications/workspace-notifications";

type Response = { items: WorkspaceNotification[]; unreadCount: number; error?: string };
const timeAgo = (value: string) => { const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000); return minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`; };

export function NotificationCenter({ onClose, onUnreadChange }: { onClose: () => void; onUnreadChange: (count: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Response | null>(null);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const next = await response.json().catch(() => null) as Response | null;
    if (response.ok && next) { setData(next); onUnreadChange(next.unreadCount); }
  }, [onUnreadChange]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { const listener = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) onClose(); }; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("mousedown", listener); window.addEventListener("keydown", escape); return () => { document.removeEventListener("mousedown", listener); window.removeEventListener("keydown", escape); }; }, [onClose]);
  const update = async (action: "read" | "read_all" | "dismiss", id?: string) => { const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) }); const next = await response.json().catch(() => null) as Response | null; if (response.ok && next) { setData(next); onUnreadChange(next.unreadCount); } };
  const items = (data?.items ?? []).filter((item) => tab === "all" ? !item.dismissedAt : item.status === "open" && !item.dismissedAt && !item.readAt);
  const open = items.filter((item) => item.status === "open" && !item.dismissedAt);
  return <div className="notification-center" ref={ref} role="dialog" aria-modal="false" aria-label="Notifications">
    <header><div><strong>Notifications</strong><span>{data ? data.unreadCount ? `${data.unreadCount} unread` : "All caught up" : "Loading"}</span></div><button className="os-iconbtn" type="button" onClick={onClose} aria-label="Close notifications"><XIcon size={13} /></button></header>
    <div className="notification-center-tabs"><button type="button" className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All</button><button type="button" className={tab === "unread" ? "active" : ""} onClick={() => setTab("unread")}>Unread</button>{data?.unreadCount ? <button type="button" onClick={() => void update("read_all")}>Mark all read</button> : null}</div>
    {!data ? <div className="notification-center-empty">Loading notifications…</div> : items.length === 0 ? <div className="notification-center-empty"><strong>You&apos;re all caught up.</strong><span>Auterim will surface approvals, connector issues, billing attention, and other important events here.</span></div> : <div className="notification-center-list">{items.map((item) => <article key={item.id} data-severity={item.severity} data-resolved={item.status === "resolved" || undefined}><div><div className="notification-center-row-head"><strong>{item.title}</strong>{!item.readAt && item.status === "open" && <i aria-label="Unread" />}</div><p>{item.description}</p><small>{item.status === "resolved" ? "Resolved" : timeAgo(item.createdAt)}</small></div><div className="notification-center-actions">{item.relatedRoute && <a href={item.relatedRoute} onClick={() => { if (!item.readAt) void update("read", item.id); onClose(); }}>Open</a>}{!item.readAt && item.status === "open" && <button type="button" onClick={() => void update("read", item.id)}>Mark read</button>}{item.status === "open" && item.severity !== "critical" && <button type="button" onClick={() => void update("dismiss", item.id)}>Dismiss</button>}</div></article>)}</div>}
    {open.length > 0 && <footer><span>{open.length} needs attention</span></footer>}
  </div>;
}
