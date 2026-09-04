import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";
export const runtime = "nodejs";
export const alt = "Auterim AI workforce use cases";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() { return new ImageResponse(makePageOg({ category: "Use cases", headline: "Put the right operator around the work.", description: "Revenue, client, operations and marketing work prepared inside your boundaries.", items: ["Revenue and follow-up", "Client onboarding", "Recurring operations"] }), { ...size }); }
