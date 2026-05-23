"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { OSSidebar } from "@/components/dashboard/sidebar";
import { OSTopbar } from "@/components/dashboard/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useOS();
  const isOnboardingRoute = pathname === "/app/onboarding";
  const isOnboarded = state.onboarding.isComplete;

  useEffect(() => {
    if (!isOnboarded && !isOnboardingRoute) {
      router.replace("/app/onboarding");
      return;
    }
    if (isOnboarded && isOnboardingRoute) {
      router.replace("/app");
    }
  }, [isOnboarded, isOnboardingRoute, router]);

  if (isOnboardingRoute) {
    return (
      <div className="os-main" style={{ width: "100%", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  return (
    <div className="os">
      <OSSidebar />
      <div className="os-main">
        <OSTopbar />
        {children}
      </div>
    </div>
  );
}
