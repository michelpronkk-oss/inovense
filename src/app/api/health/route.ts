import { NextResponse } from "next/server";
import { isRuntimeConfigValid } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export function GET() {
  const healthy = isRuntimeConfigValid();
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "auterim",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.npm_package_version || "unknown",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
