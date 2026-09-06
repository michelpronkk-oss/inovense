import type { ReactNode } from "react";

/** Presentation only: the caller supplies the existing product state and label. */
export function StatusBadge({ state, children }: { state: string; children: ReactNode }) {
  return <span className="os-status" data-state={state}>{children}</span>;
}
