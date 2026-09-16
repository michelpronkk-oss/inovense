"use client";

import { useEffect, useRef, useState } from "react";

export const WORKSPACE_REALTIME_EVENT = "auterim:workspace-realtime-invalidation";
export const WORKSPACE_REALTIME_STATUS_EVENT = "auterim:workspace-realtime-status";
export const WORKSPACE_REALTIME_SURFACES = ["dashboard", "approvals", "workflows", "activity", "connectors", "operators", "memory", "logs", "insights"] as const;
export type WorkspaceRealtimeSurface = typeof WORKSPACE_REALTIME_SURFACES[number];
export type WorkspaceRealtimeInvalidation = {
  workspaceId: string;
  surface: WorkspaceRealtimeSurface;
  revision: number;
  updatedAt: string;
};

export type WorkspaceRealtimeStatus = {
  workspaceId: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  updatedAt: string;
};

export function parseWorkspaceRealtimeInvalidation(value: unknown): WorkspaceRealtimeInvalidation | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.workspaceId !== "string" || !row.workspaceId
    || typeof row.surface !== "string" || !WORKSPACE_REALTIME_SURFACES.includes(row.surface as WorkspaceRealtimeSurface)
    || typeof row.revision !== "number" || !Number.isSafeInteger(row.revision) || row.revision < 1
    || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt))) return null;
  return { workspaceId: row.workspaceId, surface: row.surface as WorkspaceRealtimeSurface, revision: row.revision, updatedAt: row.updatedAt };
}

export function parseWorkspaceRealtimeStatus(value: unknown): WorkspaceRealtimeStatus | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.workspaceId !== "string" || !row.workspaceId
    || typeof row.status !== "string" || !["connecting", "connected", "disconnected", "error"].includes(row.status)
    || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt))) return null;
  return {
    workspaceId: row.workspaceId,
    status: row.status as WorkspaceRealtimeStatus["status"],
    updatedAt: row.updatedAt,
  };
}

/** Realtime delivery is at-least-once and can be out of order during
 * reconnects. Consumers accept only strictly newer revisions per surface. */
export function acceptWorkspaceRealtimeRevision(
  lastRevisions: ReadonlyMap<WorkspaceRealtimeSurface, number>,
  event: WorkspaceRealtimeInvalidation,
): boolean {
  return event.revision > (lastRevisions.get(event.surface) ?? 0);
}

export function useWorkspaceRealtimeInvalidation(
  workspaceId: string | null | undefined,
  surfaces: readonly WorkspaceRealtimeSurface[],
  callback: (event: WorkspaceRealtimeInvalidation) => void,
) {
  const callbackRef = useRef(callback);
  const lastRevisions = useRef(new Map<WorkspaceRealtimeSurface, number>());
  const surfaceKey = [...new Set(surfaces)].sort().join(",");

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    lastRevisions.current.clear();
    if (!workspaceId || !surfaceKey) return;
    const allowed = new Set(surfaceKey.split(","));
    const onInvalidation = (event: Event) => {
      const parsed = parseWorkspaceRealtimeInvalidation((event as CustomEvent<unknown>).detail);
      if (parsed?.workspaceId === workspaceId && allowed.has(parsed.surface) && acceptWorkspaceRealtimeRevision(lastRevisions.current, parsed)) {
        lastRevisions.current.set(parsed.surface, parsed.revision);
        callbackRef.current(parsed);
      }
    };
    window.addEventListener(WORKSPACE_REALTIME_EVENT, onInvalidation);
    return () => window.removeEventListener(WORKSPACE_REALTIME_EVENT, onInvalidation);
  }, [workspaceId, surfaceKey]);
}

/**
 * Realtime is an optimisation over the honest server fetch. Consumers can
 * keep showing the last persisted response while this status is disconnected
 * and rely on their existing focus/polling fallback.
 */
export function useWorkspaceRealtimeStatus(workspaceId: string | null | undefined): WorkspaceRealtimeStatus["status"] {
  const [status, setStatus] = useState<WorkspaceRealtimeStatus["status"]>("connecting");

  useEffect(() => {
    if (!workspaceId) return;
    const onStatus = (event: Event) => {
      const parsed = parseWorkspaceRealtimeStatus((event as CustomEvent<unknown>).detail);
      if (parsed?.workspaceId === workspaceId) setStatus(parsed.status);
    };
    window.addEventListener(WORKSPACE_REALTIME_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(WORKSPACE_REALTIME_STATUS_EVENT, onStatus);
  }, [workspaceId]);

  return status;
}
