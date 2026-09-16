"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

export const WORKSPACE_REALTIME_EVENT = "auterim:workspace-realtime-invalidation";
export const WORKSPACE_REALTIME_STATUS_EVENT = "auterim:workspace-realtime-status";
export const WORKSPACE_REALTIME_RECONNECTED_EVENT = "auterim:workspace-realtime-reconnected";
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
  status: "connecting" | "connected" | "reconnecting" | "disconnected" | "stale";
  updatedAt: string;
};

const statusSnapshots = new Map<string, WorkspaceRealtimeStatus>();
const statusListeners = new Map<string, Set<() => void>>();

function statusSnapshot(workspaceId: string): WorkspaceRealtimeStatus["status"] {
  return statusSnapshots.get(workspaceId)?.status ?? "connecting";
}

function setStatusSnapshot(status: WorkspaceRealtimeStatus): void {
  const previous = statusSnapshots.get(status.workspaceId);
  if (previous?.status === status.status && previous.updatedAt === status.updatedAt) return;
  statusSnapshots.set(status.workspaceId, status);
  statusListeners.get(status.workspaceId)?.forEach((listener) => listener());
}

/** Publishes a status to both the in-memory snapshot and the legacy DOM event. */
export function publishWorkspaceRealtimeStatus(input: Omit<WorkspaceRealtimeStatus, "updatedAt"> & { updatedAt?: string }): void {
  const status = { ...input, updatedAt: input.updatedAt ?? new Date().toISOString() };
  setStatusSnapshot(status);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WORKSPACE_REALTIME_STATUS_EVENT, { detail: status }));
  }
}

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
    || typeof row.status !== "string" || !["connecting", "connected", "reconnecting", "disconnected", "stale", "error"].includes(row.status)
    || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt))) return null;
  return {
    workspaceId: row.workspaceId,
    // `error` was emitted by the first implementation. Keep parsing old
    // fixture/provider events without allowing it to become a user-facing
    // fifth connection state.
    status: (row.status === "error" ? "disconnected" : row.status) as WorkspaceRealtimeStatus["status"],
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
  return useSyncExternalStore(
    (listener) => {
      if (!workspaceId) return () => {};
      const listeners = statusListeners.get(workspaceId) ?? new Set<() => void>();
      listeners.add(listener);
      statusListeners.set(workspaceId, listeners);
      const onStatus = (event: Event) => {
        const parsed = parseWorkspaceRealtimeStatus((event as CustomEvent<unknown>).detail);
        if (parsed?.workspaceId === workspaceId) setStatusSnapshot(parsed);
      };
      window.addEventListener(WORKSPACE_REALTIME_STATUS_EVENT, onStatus);
      return () => {
        window.removeEventListener(WORKSPACE_REALTIME_STATUS_EVENT, onStatus);
        listeners.delete(listener);
        if (listeners.size === 0) statusListeners.delete(workspaceId);
      };
    },
    () => workspaceId ? statusSnapshot(workspaceId) : "connecting",
    () => "connecting",
  );
}

export function useWorkspaceRealtimeReconnection(workspaceId: string | null | undefined, callback: () => void): void {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (!workspaceId) return;
    const onReconnect = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (detail && typeof detail === "object" && (detail as { workspaceId?: unknown }).workspaceId === workspaceId) callbackRef.current();
    };
    window.addEventListener(WORKSPACE_REALTIME_RECONNECTED_EVENT, onReconnect);
    return () => window.removeEventListener(WORKSPACE_REALTIME_RECONNECTED_EVENT, onReconnect);
  }, [workspaceId]);
}
