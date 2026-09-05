"use client";

import Link from "next/link";
import { usePublicUserState, getPublicWorkspaceCta } from "@/lib/public-user-state";

export function WorkspaceCta({ className, children }: { className?: string; children?: React.ReactNode }) {
  const state = usePublicUserState();
  const cta = getPublicWorkspaceCta(state);
  return <Link href={cta.href} className={className}>{children ?? cta.label}</Link>;
}
