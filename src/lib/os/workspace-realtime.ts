"use client";

import { useEffect, useRef } from "react";

export const WORKSPACE_REALTIME_EVENT = "auterim:workspace-realtime-invalidation";
export const WORKSPACE_REALTIME_SURFACES = ["dashboard", "approvals", "workflows", "activity", "connectors", "operators"] as const;
export type WorkspaceRealtimeSurface = typeof WORKSPACE_REALTIME_SURFACES[number];
export type WorkspaceRealtimeInvalidation = {
  workspaceId: string;
  surface: WorkspaceRealtimeSurface;
  revision: number;
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

export function useWorkspaceRealtimeInvalidation(
  workspaceId: string | null | undefined,
  surfaces: readonly WorkspaceRealtimeSurface[],
  callback: (event: WorkspaceRealtimeInvalidation) => void,
) {
  const callbackRef = useRef(callback);
  const surfaceKey = [...new Set(surfaces)].sort().join(",");

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!workspaceId || !surfaceKey) return;
    const allowed = new Set(surfaceKey.split(","));
    const onInvalidation = (event: Event) => {
      const parsed = parseWorkspaceRealtimeInvalidation((event as CustomEvent<unknown>).detail);
      if (parsed?.workspaceId === workspaceId && allowed.has(parsed.surface)) callbackRef.current(parsed);
    };
    window.addEventListener(WORKSPACE_REALTIME_EVENT, onInvalidation);
    return () => window.removeEventListener(WORKSPACE_REALTIME_EVENT, onInvalidation);
  }, [workspaceId, surfaceKey]);
}
