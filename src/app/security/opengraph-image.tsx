import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Security â€” Policy enforcement and audit trail for AI operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Platform",
      headline: "Operators act. Policies decide. Humans approve.",
      description: "Every agent runs inside your defined policy boundaries.",
      items: ["Policy engine", "Approval gates", "Immutable audit logs"],
    }),
    { ...size }
  );
}
