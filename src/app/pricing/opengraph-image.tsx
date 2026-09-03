import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Pricing — Start with a free preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Pricing",
      headline: "Start with one operator.",
      description: "Transparent pricing. Expand when the value is proven.",
      items: ["Starter — Free", "Growth — $149/mo", "Scale — Custom"],
    }),
    { ...size }
  );
}
