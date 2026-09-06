import "./dashboard.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppProvider } from "@/lib/os/app-provider";
import { AppShell } from "@/app/app/app-shell";
import { resolveAppGateway } from "@/lib/server/app-gateway";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Auterim OS",
  description: "AI agents that run your work.",
};

// Paths that never require an authenticated + provisioned session. These
// map 1:1 to files under src/app/app/*.
const PUBLIC_APP_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/invite/accept",
]);

// Visiting these while already signed in should not show the auth form -
// send the user into the app, where the gateway below resolves the correct
// next step (onboarding vs. activate vs. dashboard).
const AUTH_ENTRY_PATHS = new Set(["/login", "/register"]);

/**
 * Middleware sets `x-pathname` to the ORIGINAL (pre-rewrite) request path
 * for the app host surface, which may or may not already carry the `/app`
 * prefix (e.g. "/", "/login", "/app/onboarding" via a direct email link).
 * Normalize it the same way middleware computes its rewrite target so the
 * guard below always compares against the canonical internal path.
 */
function normalizeExternalAppPath(raw: string | null): string {
  if (!raw || raw === "/") return "/";
  if (raw === "/app") return "/";
  return raw.startsWith("/app/") ? raw.slice(4) : raw;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = normalizeExternalAppPath(headerList.get("x-pathname"));

  if (AUTH_ENTRY_PATHS.has(pathname)) {
    const user = await getVerifiedSupabaseUser();
    if (user) redirect("/");
  } else if (!PUBLIC_APP_PATHS.has(pathname)) {
    const gateway = await resolveAppGateway();

    if (gateway.status === "unauthenticated") {
      redirect(`/login?from=${encodeURIComponent(pathname)}`);
    }

    if (gateway.status === "error") {
      redirect("/login?error=provisioning_failed");
    }

    if (gateway.status === "ready") {
      const onboardingDone = Boolean(gateway.onboardingCompletedAt);
      if (!onboardingDone && pathname !== "/onboarding") {
        redirect("/onboarding");
      }
      if (onboardingDone && pathname === "/onboarding") {
        redirect("/");
      }
    }
    // gateway.status === "unconfigured": Supabase isn't set up in this
    // environment (e.g. local preview without env vars). Fall through to
    // the existing client-side preview/dev experience rather than hard
    // failing, matching pre-existing local-preview behavior.
  }

  return (
    <AppProvider>
      <div
        className="os-root"
        style={{
          background:
            "radial-gradient(800px 500px at 80% -200px, rgba(77,232,225,0.05), transparent 60%), #06070A",
          minHeight: "100dvh",
        }}
      >
        <AppShell>{children}</AppShell>
      </div>
    </AppProvider>
  );
}
