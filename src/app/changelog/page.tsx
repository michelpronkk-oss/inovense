import type { Metadata } from "next";
import { changelogReleases } from "@/data/changelog";
import ChangelogEditorial from "@/components/home-v3/changelog-editorial";

export const metadata: Metadata = {
  title: "Product Updates",
  description: "Follow new Auterim features, connector improvements, operator capabilities and updates to the AI workforce platform.",
  alternates: { canonical: "https://auterim.com/changelog" },
  openGraph: {
    url: "https://auterim.com/changelog",
    title: "Auterim Changelog | Product Updates",
    description: "Follow new Auterim features, connector improvements, operator capabilities and updates to the AI workforce platform.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auterim Changelog | Product Updates",
    description: "Follow new Auterim features, connector improvements, operator capabilities and updates to the AI workforce platform.",
  },
};

export default function ChangelogPage() {
  return <ChangelogEditorial releases={changelogReleases} />;
}
