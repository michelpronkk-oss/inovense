import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Status — Product preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "Product preview status.",
      description: "Public service monitoring is not published during product preview.",
      items: ["Product preview", "Support updates", "hello@auterim.com"],
    }),
    { ...size }
  );
}
