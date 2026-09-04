import { AUTERIM_URL } from "@/lib/brand";

type StaticOgAsset = { file: string; alt: string };

const STATIC_OG: Record<string, StaticOgAsset> = {
  "/": { file: "og-home.png", alt: "Auterim — The AI workforce built around your business" },
  "/about": { file: "og-about.png", alt: "About Auterim" },
  "/agents": { file: "og-agents.png", alt: "Auterim AI Operators" },
  "/operators": { file: "og-operators.png", alt: "Auterim AI Operator Registry" },
  "/use-cases": { file: "og-use-cases.png", alt: "Auterim AI workforce use cases" },
  "/getting-started": { file: "og-getting-started.png", alt: "Getting started with Auterim" },
  "/workflows": { file: "og-workflows.png", alt: "Auterim controlled workflows" },
  "/integrations": { file: "og-integrations.png", alt: "Auterim integrations" },
  "/approvals": { file: "og-approvals.png", alt: "Auterim approvals — human control built in" },
  "/memory": { file: "og-memory.png", alt: "Auterim company memory" },
  "/architecture": { file: "og-architecture.png", alt: "Auterim platform architecture" },
  "/security": { file: "og-security.png", alt: "Auterim security and policy controls" },
  "/trust": { file: "og-trust.png", alt: "Auterim trust and data boundaries" },
  "/pricing": { file: "og-pricing.png", alt: "Auterim pricing" },
  "/contact": { file: "og-contact.png", alt: "Contact Auterim" },
  "/solutions/revenue-teams": { file: "og-revenue-teams.png", alt: "Auterim for revenue teams" },
  "/solutions/client-services": { file: "og-client-services.png", alt: "Auterim for client services" },
  "/solutions/operations": { file: "og-operations.png", alt: "Auterim for operations teams" },
  "/solutions/marketing": { file: "og-marketing.png", alt: "Auterim for marketing teams" },
  "/solutions/founders-ops": { file: "og-founders-ops.png", alt: "Auterim for founders and operations" },
};

const FALLBACK: StaticOgAsset = STATIC_OG["/"];

export function staticOgForPath(pathname: string): StaticOgAsset {
  const normalized = pathname.split("?")[0].replace(/\/$/, "") || "/";
  return STATIC_OG[normalized] ?? FALLBACK;
}

export function staticOgImage(pathname: string) {
  const asset = staticOgForPath(pathname);
  return {
    url: `${AUTERIM_URL}/og/${asset.file}`,
    width: 1200,
    height: 630,
    alt: asset.alt,
  };
}

export const STATIC_OG_ROUTES = Object.keys(STATIC_OG);
