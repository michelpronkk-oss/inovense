import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";
export const runtime = "nodejs";
export const alt = "Getting started with Auterim";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() { return new ImageResponse(makePageOg({ category: "Getting started", headline: "Start with context. Connect systems when ready.", description: "Preview the right AI workforce before enabling controlled execution.", items: ["Build your company profile", "Recommend the first operator", "Deploy behind your policies"] }), { ...size }); }
