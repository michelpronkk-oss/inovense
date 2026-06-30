import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Integrations â€” Connect your stack to the operating layer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Platform",
      headline: "Your stack, connected",
      description: "Native connectors for CRMs, comms, finance, and data.",
      items: ["CRM & Sales", "Communication", "Finance & data"],
    }),
    { ...size }
  );
}
