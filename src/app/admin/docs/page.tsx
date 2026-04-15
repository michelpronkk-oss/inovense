import type { Metadata } from "next";
import { DocsClient } from "./docs-client";

export const metadata: Metadata = {
  title: "Docs | Inovense Admin",
  robots: { index: false, follow: false },
};

export default function DocsPage() {
  return <DocsClient />;
}
